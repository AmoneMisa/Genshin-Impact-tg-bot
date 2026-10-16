// Auction house shared by all players: players put equipment, potions or materials up for gold, others buy them.
//
// There is one character per player for the whole game (functions/general/characterSync.js), so the auction is not
// split by chat. Lots live in their own collection (db/models/AuctionLot.js) and the item is held in escrow there,
// so a lot cannot be spent twice. `chatId` is only the chat the lot was listed from: it is the chat whose lock is
// taken when the seller has to be reached while he is not playing.
//
// Like Lineage II, the money of a sale and an unsold item come back by mail (the system mailbox, miniapp/promo.js):
//   - a sale: the buyer is served under his own lock and the seller gets a letter with the adena (price minus the
//     5% fee). If the seller is not a member of the buyer's chat document the lot keeps the payout (`paidOut: false`);
//     deliverSale() mails it under the seller's chat lock right after, and the hourly sweep / the seller's next visit
//     repeat it if that failed. A payout is claimed atomically, so a letter is never sent twice;
//   - a lot nobody bought for AUCTION_HOURS: the item comes back in a letter (the hourly sweep, or the seller's visit).
// Cancelling a lot by hand returns the item at once.

import { addMaterial, getMaterials, getMaterialCount, materialInfo } from '../functions/game/player/materials.js';
import { describeItemStats } from '../functions/game/equipment/describeStats.js';
import {equipmentTransferBlocked} from '../functions/game/equipment/tradeRestrictions.js';
import { masterworkName } from '../functions/game/equipment/itemBonuses.js';
import { memberName } from './social.js';
import { hasInventoryRoom } from '../functions/game/builds/palaceCapacity.js';
import { addMail } from './promo.js';

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
    .filter(item => item?.uid && !item.isUsed && !equipmentTransferBlocked(item) && !item.pvp)
    .map(item => ({ kind: 'equipment', ref: item.uid, ...viewOfEquipment(item), count: 1 }));
  const potions = (inventory?.potions?.items || [])
    .filter(potion => number(potion.count) > 0 && !potion.bound && !potion.noTrade)
    .map(potion => ({ kind: 'potion', ref: potionKey(potion), ...viewOfPotion(potion), count: number(potion.count) }));
  const materials = Object.entries(getMaterials(session))
    .filter(([key, count]) => number(count) > 0 && !materialInfo(key).bound)
    .map(([key, count]) => ({ kind: 'material', ref: key, ...viewOfMaterial(key), count: number(count) }));
  return [...equipment, ...potions, ...materials];
}

function viewOfEquipment(item) {
  return {
    title: masterworkName(item) || 'Предмет',
    masterwork: Boolean(item.masterwork),
    icon: item.mainType === 'weapon' ? '⚔️' : item.mainType === 'jewelry' ? '💍' : item.mainType === 'shield' ? '🛡️' : '🥋',
    grade: item.grade || 'noGrade',
    enchant: number(item.enchant),
    mainType: item.mainType || 'equipment',
    artItem: {name: item.name, grade: item.grade, mainType: item.mainType, kind: item.kind, category: item.category,costumeId:item.costumeId},
    costumeId:item.costumeId||null,costumeGender:item.costumeGender||null,expiresAt:item.timed?item.expiresAt:null,
    stats: describeItemStats(item).slice(0, 6).map(stat => stat.text),
  };
}

function viewOfPotion(potion) {
  return { title: potion.name || 'Зелье', icon: '🧪', description: potion.description || '', grade: potion.grade || null, artPotion: {type: potion.type, id: potion.id, size: potion.size, bottleType: potion.bottleType} };
}

function viewOfMaterial(key) {
  const info = materialInfo(key);
  return { title: info.name, icon: info.icon || '✦', description: info.description || '', materialKey: key };
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
    async listActive() { return (await AuctionLot.find({ status: 'active' }).sort({ createdAt: -1 }).limit(500).lean()).map(plain); },
    async listBySeller(chatId, sellerId) { return (await AuctionLot.find({ chatId, sellerId, status: 'active' }).sort({ createdAt: -1 }).lean()).map(plain); },
    async countActiveBySeller(sellerId) { return AuctionLot.countDocuments({ sellerId, status: 'active' }); },
    async listUnpaid(sellerId) { return (await AuctionLot.find({ sellerId, status: 'sold', paidOut: false }).lean()).map(plain); },
    async listAllUnpaid(limit = 200) { return (await AuctionLot.find({ status: 'sold', paidOut: false }).limit(limit).lean()).map(plain); },
    async claimPayout(id) {
      return validId(id) ? plain(await AuctionLot.findOneAndUpdate({ _id: id, status: 'sold', paidOut: false }, { $set: { paidOut: true } }, { returnDocument: 'after' }).lean()) : null;
    },
    async unclaimPayout(id) { if (validId(id)) await AuctionLot.updateOne({ _id: id, status: 'sold' }, { $set: { paidOut: false } }); },
    async listExpired(sellerId, now) { return (await AuctionLot.find({ sellerId, status: 'active', expiresAt: { $lte: now } }).lean()).map(plain); },
    async listAllExpired(now, limit = 200) { return (await AuctionLot.find({ status: 'active', expiresAt: { $lte: now } }).limit(limit).lean()).map(plain); },
    /** Atomic status change; returns the lot when this call made the change, otherwise null. */
    async claim(id, from, to, extra = {}) {
      return validId(id) ? plain(await AuctionLot.findOneAndUpdate({ _id: id, status: from }, { $set: { status: to, ...extra } }, { returnDocument: 'after' }).lean()) : null;
    },
    async restore(id, status) { await AuctionLot.updateOne({ _id: id }, { $set: { status }, $unset: { buyerId: '', soldAt: '', payout: '', paidOut: '', buyerChatId: '' } }); },
  };
}

// ---- lots ----

function lotDto(lot, viewerId, now) {
  // Old listings also have the item in escrow; no migration is needed for art.
  const art = lot.kind === 'equipment' ? viewOfEquipment(lot.payload?.item || {})
    : lot.kind === 'potion' ? viewOfPotion(lot.payload?.potion || {})
      : lot.payload?.key ? viewOfMaterial(lot.payload.key) : {};
  return {
    id: lot.id,
    kind: lot.kind,
    title: lot.view?.title || 'Лот',
    icon: lot.view?.icon || '✦',
    grade: lot.view?.grade || null,
    enchant: lot.view?.enchant ?? null,
    stats: lot.view?.stats || [],
    description: lot.view?.description || '',
    mainType: art.mainType,
    artItem: art.artItem,
    costumeId:art.costumeId,costumeGender:art.costumeGender,costumeExpiresAt:art.expiresAt,
    artPotion: art.artPotion,
    materialKey: art.materialKey,
    count: lot.count,
    price: lot.price,
    sellerName: lot.sellerName,
    mine: String(lot.sellerId) === String(viewerId),
    hoursLeft: Math.max(1, Math.ceil((lot.expiresAt - now) / HOUR_MS)),
    createdAt: new Date(lot.createdAt || 0).getTime(),
  };
}

// ---- letters of the auction ----

const lotTitle = lot => `${lot.view?.title || 'Лот'}${number(lot.count) > 1 ? ` ×${lot.count}` : ''}`;
const payoutOf = lot => Math.max(0, number(lot.payout, number(lot.price) - feeFor(number(lot.price))));

/** The letter that pays a sale. */
export const soldLetter = lot => ({
  id: `auction-sold:${lot.id}`,
  kind: 'auction',
  title: 'Аукцион: лот продан',
  text: `${lotTitle(lot)} продан за ${number(lot.price)}. Комиссия аукциона: ${feeFor(number(lot.price))}.`,
  rewards: [{ kind: 'gold', amount: payoutOf(lot) }],
});

/** The attachment of an unsold lot: the item itself. */
function lotReward(lot) {
  if (lot.kind === 'equipment') return { kind: 'equipment', item: structuredClone(lot.payload.item), amount: 1, name: lot.view?.title || 'Снаряжение' };
  if (lot.kind === 'potion') return { kind: 'potion', potion: structuredClone(lot.payload.potion), amount: number(lot.count, 1), name: lot.view?.title || 'Зелье' };
  return { kind: 'material', key: lot.payload.key, amount: number(lot.count, 1), name: lot.view?.title || materialInfo(lot.payload.key).name };
}

/** The letter that returns a lot nobody bought. */
export const returnLetter = lot => ({
  id: `auction-return:${lot.id}`,
  kind: 'auction',
  title: 'Аукцион: лот не продан',
  text: `Срок лота «${lotTitle(lot)}» вышел, предмет возвращён.`,
  rewards: [lotReward(lot)],
});

/**
 * Mails the payouts of this player's sales that are still waiting (call under the lock of the player's chat; the caller
 * saves the session). Returns the ids it claimed: when the save fails, pass them to undoMailed().
 */
export async function settleSales(session, store, now = Date.now()) {
  const done = [];
  for (const lot of await store.listUnpaid(session.userId)) {
    if (!await store.claimPayout(lot.id)) continue;
    addMail(session, soldLetter(lot), now);
    done.push(lot.id);
  }
  return done;
}

/** Mails the items of this player's lots whose time is up. Returns the ids; see settleSales. */
export async function returnExpiredLots(session, store, now = Date.now()) {
  const done = [];
  for (const lot of await store.listExpired(session.userId, now)) {
    if (!await store.claim(lot.id, 'active', 'expired', { returned: true })) continue;
    addMail(session, returnLetter(lot), now);
    done.push({ id: lot.id, expired: true });
  }
  return done;
}

/** Puts back what settleSales/returnExpiredLots claimed when the session could not be saved. */
export async function undoMailed(store, sold = [], expired = []) {
  for (const id of sold) await store.unclaimPayout(id).catch(() => {});
  for (const entry of expired) await store.restore(entry.id, 'active').catch(() => {});
}

/**
 * Reaches a seller who is not playing: loads his character through the chat of the listing, under that chat's lock,
 * mails what is waiting and saves. io: {withLock(key, fn), getSession(chatId, userId), saveSession(session)}.
 */
export async function deliverToSeller(store, io, { chatId, sellerId }, now = Date.now()) {
  return io.withLock(String(chatId), async () => {
    const session = await io.getSession(chatId, sellerId);
    const sold = await settleSales(session, store, now);
    const expired = await returnExpiredLots(session, store, now);
    if (!sold.length && !expired.length) return 0;
    try {
      await io.saveSession(session);
    } catch (error) {
      await undoMailed(store, sold, expired);
      throw error;
    }
    return sold.length + expired.length;
  });
}

/** The hourly sweep: sales that were not paid and lots that ran out, for every player. */
export async function sweepAuction(store, io, now = Date.now()) {
  const targets = new Map();
  for (const lot of await store.listAllUnpaid()) targets.set(`${lot.chatId}:${lot.sellerId}`, { chatId: lot.chatId, sellerId: lot.sellerId });
  for (const lot of await store.listAllExpired(now)) targets.set(`${lot.chatId}:${lot.sellerId}`, { chatId: lot.chatId, sellerId: lot.sellerId });
  let delivered = 0;
  for (const target of targets.values()) {
    try { delivered += await deliverToSeller(store, io, target, now); } catch (error) { console.error('[auction] sweep:', error.message); }
  }
  return delivered;
}

const SORTS = {
  new: (a, b) => b.createdAt - a.createdAt,
  cheap: (a, b) => a.price - b.price || b.createdAt - a.createdAt,
  expensive: (a, b) => b.price - a.price || b.createdAt - a.createdAt,
};

export async function getAuctionState(session, store, { kind = 'all', sort = 'new', now = Date.now() } = {}) {
  const viewerId = session.userId;
  const active = (await store.listActive()).filter(lot => lot.expiresAt > now);
  const lots = active
    .filter(lot => lot.kind!=='equipment'||!equipmentTransferBlocked(lot.payload?.item)||String(lot.sellerId)===String(viewerId))
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
  if (await store.countActiveBySeller(session.userId) >= MAX_ACTIVE_LOTS) return { ok: false, reason: 'too_many_lots' };

  let payload;
  let view;
  let lotCount = 1;
  if (kind === 'equipment') {
    const items = inventory.equipment?.items || [];
    const item = items.find(entry => entry?.uid && entry.uid === ref);
    if (!item) return { ok: false, reason: 'item_not_found' };
    if (item.isUsed) return { ok: false, reason: 'item_equipped' };
    if (item.timed||item.shadow) return { ok: false, reason: 'timed_item' };
    if(item.bound||item.noTrade||item.tradeable===false||item.canTrade===false)return {ok:false,reason:'item_unavailable'};
    items.splice(items.indexOf(item), 1);
    payload = { item: structuredClone(item) };
    view = viewOfEquipment(item);
  } else if (kind === 'potion') {
    const stack = (inventory.potions?.items || []).find(potion => potionKey(potion) === ref);
    if (!stack || number(stack.count) < 1) return { ok: false, reason: 'item_not_found' };
    if(stack.bound||stack.noTrade)return {ok:false,reason:'item_unavailable'};
    if (amount > number(stack.count)) return { ok: false, reason: 'not_enough' };
    stack.count = number(stack.count) - amount;
    const { count: _count, ...definition } = structuredClone(stack);
    payload = { potion: definition };
    view = viewOfPotion(stack);
    lotCount = amount;
  } else {
    if(materialInfo(ref).bound)return {ok:false,reason:'item_unavailable'};
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
  if (!lot || lot.status !== 'active') return { ok: false, reason: 'lot_gone' };
  if (lot.expiresAt <= now) return { ok: false, reason: 'lot_gone' };
  if(lot.kind==='equipment'&&equipmentTransferBlocked(lot.payload?.item))return {ok:false,reason:'item_unavailable'};
  if (String(lot.sellerId) === String(session.userId)) return { ok: false, reason: 'own_lot' };

  const inventory = inventoryOf(session);
  if (!inventory) return { ok: false, reason: 'inventory_missing' };
  if (!hasInventoryRoom(session)) return { ok: false, reason: 'inventory_full' };
  if (Math.max(0, number(inventory.gold)) < lot.price) return { ok: false, reason: 'not_enough_gold', missing: lot.price - number(inventory.gold) };

  // The seller is mailed the adena at once when he is a member of this chat document (one save for both);
  // otherwise the lot keeps the payout and deliverToSeller() mails it under the seller's own chat lock.
  const fee = feeFor(lot.price);
  const seller = chat.members.find(member => String(member.userId) === String(lot.sellerId));
  const immediate = Boolean(seller?.game);

  // Whoever flips the status first wins; a second buyer gets 'lot_gone'.
  const claimed = await store.claim(lot.id, 'active', 'sold', {
    buyerId: Number(session.userId), buyerChatId: chat.chatId, soldAt: now, payout: lot.price - fee, paidOut: immediate,
  });
  if (!claimed) return { ok: false, reason: 'lot_gone' };

  inventory.gold = number(inventory.gold) - lot.price;
  deliver(session, lot);
  if (immediate) addMail(seller, soldLetter({ ...lot, payout: lot.price - fee }), now);

  return {
    ok: true,
    lot: lotDto(lot, session.userId, now),
    paid: lot.price,
    fee,
    deferred: immediate ? null : { chatId: lot.chatId, sellerId: lot.sellerId },
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
