// Auction house of a chat: players put equipment, potions or materials up for gold, others buy them.
//
// Lots live in their own collection (db/models/AuctionLot.js) and the item is held in escrow
// there, so a lot cannot be spent twice. Everything runs under the chat lock; money moves between
// two members of the same Chat document and is saved once. The seller pays a 5% fee (gold sink).
// Lots that nobody buys for AUCTION_HOURS go back to the seller.

import { addMaterial, getMaterials, getMaterialCount, materialInfo } from '../functions/game/player/materials.js';
import { describeItemStats } from '../functions/game/equipment/describeStats.js';
import { isTimedItem } from '../functions/game/equipment/timedItems.js';
import { memberName } from './social.js';

export const AUCTION_HOURS = 48;
export const AUCTION_FEE = 0.05;
export const MAX_ACTIVE_LOTS = 10;
export const MAX_PRICE = 1_000_000_000;
export const KINDS = Object.freeze(['equipment', 'potion', 'material']);

const HOUR_MS = 60 * 60 * 1000;
const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export const feeFor = price => Math.floor(price * AUCTION_FEE);

const inventoryOf = session => session?.game?.inventory;
const potionKey = potion => potion?.id || `${potion?.type}:${potion?.bottleType}:${potion?.power}:${potion?.size}`;

// ---- what a player may sell ----

/** Everything the player can put up: unequipped tradeable equipment, potion stacks and materials. */
export function sellableItems(session) {
  const inventory = inventoryOf(session);
  const equipment = (inventory?.equipment?.items || [])
    .filter(item => item?.uid && !item.isUsed && !isTimedItem(item))
    .map(item => ({ kind: 'equipment', ref: item.uid, ...viewOfEquipment(item), count: 1 }));
  const potions = (inventory?.potions?.items || [])
    .filter(potion => number(potion.count) > 0)
    .map(potion => ({ kind: 'potion', ref: potionKey(potion), ...viewOfPotion(potion), count: number(potion.count) }));
  const materials = Object.entries(getMaterials(session))
    .filter(([, count]) => number(count) > 0)
    .map(([key, count]) => ({ kind: 'material', ref: key, ...viewOfMaterial(key), count: number(count) }));
  return [...equipment, ...potions, ...materials];
}

function viewOfEquipment(item) {
  return {
    title: item.name || 'Предмет',
    icon: item.mainType === 'weapon' ? '⚔️' : item.mainType === 'jewelry' ? '💍' : item.mainType === 'shield' ? '🛡️' : '🥋',
    grade: item.grade || 'noGrade',
    enchant: number(item.enchant),
    mainType: item.mainType || 'equipment',
    stats: describeItemStats(item).slice(0, 6).map(stat => stat.text),
  };
}

function viewOfPotion(potion) {
  return { title: potion.name || 'Зелье', icon: '🧪', description: potion.description || '', grade: potion.grade || null };
}

function viewOfMaterial(key) {
  const info = materialInfo(key);
  return { title: info.name, icon: info.icon || '✦', description: info.description || '' };
}

// ---- delivery of a lot's content ----

function deliver(session, lot) {
  const inventory = inventoryOf(session);
  if (!inventory) return false;
  if (lot.kind === 'equipment') {
    if (!inventory.equipment) inventory.equipment = { items: [] };
    if (!Array.isArray(inventory.equipment.items)) inventory.equipment.items = [];
    inventory.equipment.items.push({ ...structuredClone(lot.payload.item), isUsed: false });
  } else if (lot.kind === 'potion') {
    if (!inventory.potions) inventory.potions = { items: [] };
    if (!Array.isArray(inventory.potions.items)) inventory.potions.items = [];
    const stack = inventory.potions.items.find(potion => potionKey(potion) === potionKey(lot.payload.potion));
    if (stack) stack.count = number(stack.count) + lot.count;
    else inventory.potions.items.push({ ...structuredClone(lot.payload.potion), count: lot.count });
  } else {
    addMaterial(session, lot.payload.key, lot.count);
  }
  return true;
}

// ---- store (Mongo in production, a Map in tests) ----

export async function mongoAuctionStore() {
  const { default: AuctionLot } = await import('../db/models/AuctionLot.js');
  const plain = doc => (doc ? { ...doc, id: String(doc._id) } : null);
  const validId = id => /^[0-9a-f]{24}$/i.test(String(id));
  return {
    async create(fields) { return plain((await AuctionLot.create(fields)).toObject()); },
    async findById(id) { return validId(id) ? plain(await AuctionLot.findById(id).lean()) : null; },
    async listActive(chatId) { return (await AuctionLot.find({ chatId, status: 'active' }).sort({ createdAt: -1 }).limit(500).lean()).map(plain); },
    async listBySeller(chatId, sellerId) { return (await AuctionLot.find({ chatId, sellerId, status: 'active' }).sort({ createdAt: -1 }).lean()).map(plain); },
    async countActiveBySeller(chatId, sellerId) { return AuctionLot.countDocuments({ chatId, sellerId, status: 'active' }); },
    async listExpired(chatId, now) { return (await AuctionLot.find({ chatId, status: 'active', expiresAt: { $lte: now } }).lean()).map(plain); },
    /** Atomic status change; returns the lot when this call made the change, otherwise null. */
    async claim(id, from, to, extra = {}) {
      return validId(id) ? plain(await AuctionLot.findOneAndUpdate({ _id: id, status: from }, { $set: { status: to, ...extra } }, { new: true }).lean()) : null;
    },
    async restore(id, status) { await AuctionLot.updateOne({ _id: id }, { $set: { status }, $unset: { buyerId: '', soldAt: '' } }); },
  };
}

// ---- lots ----

function lotDto(lot, viewerId, now) {
  return {
    id: lot.id,
    kind: lot.kind,
    title: lot.view?.title || 'Лот',
    icon: lot.view?.icon || '✦',
    grade: lot.view?.grade || null,
    enchant: lot.view?.enchant ?? null,
    stats: lot.view?.stats || [],
    description: lot.view?.description || '',
    count: lot.count,
    price: lot.price,
    sellerName: lot.sellerName,
    mine: String(lot.sellerId) === String(viewerId),
    hoursLeft: Math.max(1, Math.ceil((lot.expiresAt - now) / HOUR_MS)),
    createdAt: new Date(lot.createdAt || 0).getTime(),
  };
}

/** Gives back the lots whose time is up (call under the chat lock; the caller saves the chat). */
export async function returnExpiredLots(chat, store, now = Date.now()) {
  let returned = 0;
  for (const lot of await store.listExpired(chat.chatId, now)) {
    const claimed = await store.claim(lot.id, 'active', 'expired', { returned: true });
    if (!claimed) continue;
    const seller = chat.members.find(member => String(member.userId) === String(lot.sellerId));
    if (seller && deliver(seller, lot)) returned++;
  }
  return returned;
}

const SORTS = {
  new: (a, b) => b.createdAt - a.createdAt,
  cheap: (a, b) => a.price - b.price || b.createdAt - a.createdAt,
  expensive: (a, b) => b.price - a.price || b.createdAt - a.createdAt,
};

export async function getAuctionState(session, store, { kind = 'all', sort = 'new', now = Date.now() } = {}) {
  const chatId = session.ownerDocument().chatId;
  const viewerId = session.userId;
  const active = (await store.listActive(chatId)).filter(lot => lot.expiresAt > now);
  const lots = active
    .filter(lot => kind === 'all' || lot.kind === kind)
    .map(lot => lotDto(lot, viewerId, now))
    .sort(SORTS[sort] || SORTS.new);
  return {
    gold: Math.max(0, number(inventoryOf(session)?.gold)),
    fee: AUCTION_FEE,
    hours: AUCTION_HOURS,
    maxLots: MAX_ACTIVE_LOTS,
    kinds: KINDS,
    lots,
    mine: active.filter(lot => String(lot.sellerId) === String(viewerId)).map(lot => lotDto(lot, viewerId, now)),
    sellable: sellableItems(session),
  };
}

/** Puts an item up. Returns {ok, lot} or {ok:false, reason}. The caller saves the chat. */
export async function createLot(session, store, { kind, ref, count = 1, price }, now = Date.now()) {
  if (!KINDS.includes(kind)) return { ok: false, reason: 'invalid_kind' };
  const amount = Math.floor(number(count));
  const cost = Math.floor(number(price));
  if (!Number.isSafeInteger(cost) || cost < 1 || cost > MAX_PRICE || Number(price) !== cost) return { ok: false, reason: 'invalid_price' };
  if (!Number.isSafeInteger(amount) || amount < 1) return { ok: false, reason: 'invalid_count' };

  const inventory = inventoryOf(session);
  if (!inventory) return { ok: false, reason: 'inventory_missing' };
  const chatId = session.ownerDocument().chatId;
  if (await store.countActiveBySeller(chatId, session.userId) >= MAX_ACTIVE_LOTS) return { ok: false, reason: 'too_many_lots' };

  let payload;
  let view;
  let lotCount = 1;
  if (kind === 'equipment') {
    const items = inventory.equipment?.items || [];
    const item = items.find(entry => entry?.uid && entry.uid === ref);
    if (!item) return { ok: false, reason: 'item_not_found' };
    if (item.isUsed) return { ok: false, reason: 'item_equipped' };
    if (isTimedItem(item)) return { ok: false, reason: 'timed_item' };
    items.splice(items.indexOf(item), 1);
    payload = { item: structuredClone(item) };
    view = viewOfEquipment(item);
  } else if (kind === 'potion') {
    const stack = (inventory.potions?.items || []).find(potion => potionKey(potion) === ref);
    if (!stack || number(stack.count) < 1) return { ok: false, reason: 'item_not_found' };
    if (amount > number(stack.count)) return { ok: false, reason: 'not_enough' };
    stack.count = number(stack.count) - amount;
    const { count: _count, ...definition } = structuredClone(stack);
    payload = { potion: definition };
    view = viewOfPotion(stack);
    lotCount = amount;
  } else {
    if (getMaterialCount(session, ref) < 1) return { ok: false, reason: 'item_not_found' };
    if (amount > getMaterialCount(session, ref)) return { ok: false, reason: 'not_enough' };
    getMaterials(session)[ref] = getMaterialCount(session, ref) - amount;
    payload = { key: ref };
    view = viewOfMaterial(ref);
    lotCount = amount;
  }

  const lot = await store.create({
    chatId,
    sellerId: Number(session.userId),
    sellerName: memberName(session),
    kind,
    count: lotCount,
    price: cost,
    view,
    payload,
    status: 'active',
    expiresAt: now + AUCTION_HOURS * HOUR_MS,
  });
  return { ok: true, lot: lotDto(lot, session.userId, now) };
}

/** Buys a lot. Returns {ok, lot, paid, fee}. The caller saves the chat (and calls `undo` if that fails). */
export async function buyLot(session, store, lotId, now = Date.now()) {
  const chat = session.ownerDocument();
  const lot = await store.findById(lotId);
  if (!lot || lot.chatId !== chat.chatId || lot.status !== 'active') return { ok: false, reason: 'lot_gone' };
  if (lot.expiresAt <= now) return { ok: false, reason: 'lot_gone' };
  if (String(lot.sellerId) === String(session.userId)) return { ok: false, reason: 'own_lot' };

  const inventory = inventoryOf(session);
  if (!inventory) return { ok: false, reason: 'inventory_missing' };
  if (Math.max(0, number(inventory.gold)) < lot.price) return { ok: false, reason: 'not_enough_gold', missing: lot.price - number(inventory.gold) };

  // Whoever flips the status first wins; a second buyer gets 'lot_gone'.
  const claimed = await store.claim(lot.id, 'active', 'sold', { buyerId: Number(session.userId), soldAt: now });
  if (!claimed) return { ok: false, reason: 'lot_gone' };

  const seller = chat.members.find(member => String(member.userId) === String(lot.sellerId));
  const fee = feeFor(lot.price);
  inventory.gold = number(inventory.gold) - lot.price;
  deliver(session, lot);
  if (seller?.game?.inventory) seller.game.inventory.gold = Math.max(0, number(seller.game.inventory.gold)) + lot.price - fee;

  return {
    ok: true,
    lot: lotDto(lot, session.userId, now),
    paid: lot.price,
    fee,
    undo: () => store.restore(lot.id, 'active'),
  };
}

/** The seller takes an active lot back. The caller saves the chat. */
export async function cancelLot(session, store, lotId) {
  const lot = await store.findById(lotId);
  if (!lot || lot.status !== 'active') return { ok: false, reason: 'lot_gone' };
  if (String(lot.sellerId) !== String(session.userId)) return { ok: false, reason: 'not_yours' };
  const claimed = await store.claim(lot.id, 'active', 'cancelled', { returned: true });
  if (!claimed) return { ok: false, reason: 'lot_gone' };
  deliver(session, lot);
  return { ok: true, lot: lotDto(lot, session.userId, Date.now()) };
}
