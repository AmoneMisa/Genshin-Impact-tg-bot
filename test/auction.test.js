import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUCTION_HOURS, MAX_ACTIVE_LOTS, buyLot, cancelLot, createLot, feeFor, getAuctionState, returnExpiredLots, sellableItems,
} from '../miniapp/auction.js';
import { getCatalog, instantiate } from '../functions/game/equipment/catalog.js';
import { getMaterialCount } from '../functions/game/player/materials.js';
import { grantTimedItem } from '../functions/game/equipment/timedItems.js';

const NOW = Date.UTC(2026, 9, 12, 12);
const HOUR = 3_600_000;

function memoryStore() {
  const lots = new Map();
  let seq = 0;
  const copy = lot => (lot ? { ...lot, id: lot._id } : null);
  return {
    lots,
    async create(fields) { const _id = `lot${++seq}`; lots.set(_id, { _id, createdAt: NOW + seq, ...fields }); return copy(lots.get(_id)); },
    async findById(id) { return copy(lots.get(id)); },
    async listActive(chatId) { return [...lots.values()].filter(lot => lot.chatId === chatId && lot.status === 'active').map(copy); },
    async listBySeller(chatId, sellerId) { return [...lots.values()].filter(lot => lot.chatId === chatId && lot.sellerId === sellerId && lot.status === 'active').map(copy); },
    async countActiveBySeller(chatId, sellerId) { return [...lots.values()].filter(lot => lot.chatId === chatId && lot.sellerId === sellerId && lot.status === 'active').length; },
    async listExpired(chatId, now) { return [...lots.values()].filter(lot => lot.chatId === chatId && lot.status === 'active' && lot.expiresAt <= now).map(copy); },
    async claim(id, from, to, extra = {}) {
      const lot = lots.get(id);
      if (!lot || lot.status !== from) return null;
      Object.assign(lot, { status: to, ...extra });
      return copy(lot);
    },
    async restore(id, status) { Object.assign(lots.get(id), { status }); delete lots.get(id).buyerId; },
  };
}

function chatWith(...gold) {
  const chat = { chatId: -100, members: [] };
  gold.forEach((amount, index) => {
    chat.members.push({
      userId: index + 1,
      userChatData: { user: { first_name: `P${index + 1}` } },
      ownerDocument: () => chat,
      game: { inventory: { gold: amount, equipment: { items: [] }, potions: { items: [] }, materials: {} } },
    });
  });
  return chat;
}

const weapon = () => instantiate(getCatalog().find(item => item.grade === 'A' && item.mainType === 'weapon' && !item.epic));

test('selling takes the item out of the inventory and lists it with a 48 hour clock', async () => {
  const store = memoryStore();
  const [seller] = chatWith(0).members;
  const sword = weapon();
  seller.game.inventory.equipment.items.push(sword);
  seller.game.inventory.potions.items.push({ id: 'might', type: 'buff', bottleType: 'elixir', name: 'Зелье Might', count: 5 });
  seller.game.inventory.materials.scroll_A = 3;

  assert.deepEqual(sellableItems(seller).map(entry => entry.kind), ['equipment', 'potion', 'material']);

  const sword1 = await createLot(seller, store, { kind: 'equipment', ref: sword.uid, price: 5000 }, NOW);
  assert.equal(sword1.ok, true);
  assert.equal(seller.game.inventory.equipment.items.length, 0);
  assert.equal([...store.lots.values()][0].expiresAt, NOW + AUCTION_HOURS * HOUR);

  const potions = await createLot(seller, store, { kind: 'potion', ref: 'might', count: 2, price: 300 }, NOW);
  assert.equal(potions.ok, true);
  assert.equal(seller.game.inventory.potions.items[0].count, 3);
  const scrolls = await createLot(seller, store, { kind: 'material', ref: 'scroll_A', count: 3, price: 900 }, NOW);
  assert.equal(scrolls.ok, true);
  assert.equal(getMaterialCount(seller, 'scroll_A'), 0);
});

test('invalid listings are refused and change nothing', async () => {
  const store = memoryStore();
  const [seller] = chatWith(0).members;
  const sword = weapon();
  sword.isUsed = true;
  seller.game.inventory.equipment.items.push(sword);
  seller.game.inventory.potions.items.push({ id: 'might', count: 1 });
  const ask = (input) => createLot(seller, store, input, NOW);

  assert.equal((await ask({ kind: 'gold', ref: 'x', price: 5 })).reason, 'invalid_kind');
  assert.equal((await ask({ kind: 'equipment', ref: sword.uid, price: 0 })).reason, 'invalid_price');
  assert.equal((await ask({ kind: 'equipment', ref: sword.uid, price: 1.5 })).reason, 'invalid_price');
  assert.equal((await ask({ kind: 'equipment', ref: sword.uid, price: 2e9 })).reason, 'invalid_price');
  assert.equal((await ask({ kind: 'equipment', ref: sword.uid, price: 10 })).reason, 'item_equipped');
  assert.equal((await ask({ kind: 'equipment', ref: 'nope', price: 10 })).reason, 'item_not_found');
  assert.equal((await ask({ kind: 'potion', ref: 'might', count: 5, price: 10 })).reason, 'not_enough');
  assert.equal((await ask({ kind: 'material', ref: 'scroll_A', count: 1, price: 10 })).reason, 'item_not_found');
  assert.equal(store.lots.size, 0);
  assert.equal(seller.game.inventory.equipment.items.length, 1);
  assert.equal(seller.game.inventory.potions.items[0].count, 1);
});

test('rented epic items and the 11th lot are refused', async () => {
  const store = memoryStore();
  const [seller] = chatWith(0).members;
  const rented = grantTimedItem(seller, getCatalog().find(item => item.epic && item.mainType === 'weapon').id, 7, NOW).item;
  assert.equal((await createLot(seller, store, { kind: 'equipment', ref: rented.uid, price: 10 }, NOW)).reason, 'timed_item');
  assert.equal(sellableItems(seller).length, 0, 'it is not even offered');

  seller.game.inventory.materials.scroll_A = 100;
  for (let index = 0; index < MAX_ACTIVE_LOTS; index++) {
    assert.equal((await createLot(seller, store, { kind: 'material', ref: 'scroll_A', count: 1, price: 10 }, NOW)).ok, true);
  }
  assert.equal((await createLot(seller, store, { kind: 'material', ref: 'scroll_A', count: 1, price: 10 }, NOW)).reason, 'too_many_lots');
});

test('a purchase moves gold (minus the 5% fee) and the item, once', async () => {
  const store = memoryStore();
  const chat = chatWith(0, 10_000, 10_000);
  const [seller, buyer, rival] = chat.members;
  const sword = weapon();
  seller.game.inventory.equipment.items.push(sword);
  const { lot } = await createLot(seller, store, { kind: 'equipment', ref: sword.uid, price: 4000 }, NOW);

  const bought = await buyLot(buyer, store, lot.id, NOW + HOUR);
  assert.equal(bought.ok, true);
  assert.equal(bought.fee, feeFor(4000));
  assert.equal(feeFor(4000), 200);
  assert.equal(buyer.game.inventory.gold, 6000);
  assert.equal(seller.game.inventory.gold, 3800);
  assert.equal(buyer.game.inventory.equipment.items.length, 1);
  assert.equal(buyer.game.inventory.equipment.items[0].uid, sword.uid);
  assert.equal(buyer.game.inventory.equipment.items[0].isUsed, false);

  const second = await buyLot(rival, store, lot.id, NOW + HOUR);
  assert.equal(second.reason, 'lot_gone');
  assert.equal(rival.game.inventory.gold, 10_000);
  assert.equal(rival.game.inventory.equipment.items.length, 0);
});

test('buying is refused for poor buyers, the seller, other chats and expired lots', async () => {
  const store = memoryStore();
  const chat = chatWith(0, 100);
  const [seller, buyer] = chat.members;
  seller.game.inventory.materials.scroll_A = 2;
  const { lot } = await createLot(seller, store, { kind: 'material', ref: 'scroll_A', count: 2, price: 500 }, NOW);

  assert.equal((await buyLot(buyer, store, lot.id, NOW)).reason, 'not_enough_gold');
  assert.equal((await buyLot(seller, store, lot.id, NOW)).reason, 'own_lot');
  assert.equal((await buyLot(buyer, store, 'missing', NOW)).reason, 'lot_gone');
  buyer.game.inventory.gold = 1000;
  assert.equal((await buyLot(buyer, store, lot.id, NOW + AUCTION_HOURS * HOUR + 1)).reason, 'lot_gone', 'expired');
  const otherChat = chatWith(0, 1000);
  otherChat.chatId = -200;
  assert.equal((await buyLot(otherChat.members[1], store, lot.id, NOW)).reason, 'lot_gone', 'another chat has its own auction');
  assert.equal(buyer.game.inventory.gold, 1000);
  assert.equal(getMaterialCount(buyer, 'scroll_A'), 0);
});

test('a failed save can undo the sale', async () => {
  const store = memoryStore();
  const chat = chatWith(0, 1000);
  const [seller, buyer] = chat.members;
  seller.game.inventory.materials.scroll_A = 1;
  const { lot } = await createLot(seller, store, { kind: 'material', ref: 'scroll_A', price: 100 }, NOW);
  const bought = await buyLot(buyer, store, lot.id, NOW);
  assert.equal(store.lots.get(lot.id).status, 'sold');
  await bought.undo();
  assert.equal(store.lots.get(lot.id).status, 'active');
});

test('the seller can take a lot back; expired lots return to their sellers', async () => {
  const store = memoryStore();
  const chat = chatWith(0, 0);
  const [seller, other] = chat.members;
  seller.game.inventory.potions.items.push({ id: 'might', type: 'buff', name: 'Might', count: 4 });
  const { lot } = await createLot(seller, store, { kind: 'potion', ref: 'might', count: 4, price: 80 }, NOW);
  assert.equal(seller.game.inventory.potions.items[0].count, 0);

  assert.equal((await cancelLot(other, store, lot.id)).reason, 'not_yours');
  assert.equal((await cancelLot(seller, store, lot.id)).ok, true);
  assert.equal(seller.game.inventory.potions.items[0].count, 4, 'the stack is merged back');
  assert.equal((await cancelLot(seller, store, lot.id)).reason, 'lot_gone');

  seller.game.inventory.materials.crystal_A = 5;
  await createLot(seller, store, { kind: 'material', ref: 'crystal_A', count: 5, price: 50 }, NOW);
  assert.equal(await returnExpiredLots(chat, store, NOW + HOUR), 0, 'not yet');
  assert.equal(await returnExpiredLots(chat, store, NOW + AUCTION_HOURS * HOUR + 1), 1);
  assert.equal(getMaterialCount(seller, 'crystal_A'), 5);
  assert.equal(await returnExpiredLots(chat, store, NOW + AUCTION_HOURS * HOUR + 1), 0, 'only once');
});

test('the state lists lots of the chat by category and sort, marks the viewer\'s own', async () => {
  const store = memoryStore();
  const chat = chatWith(0, 0);
  const [a, b] = chat.members;
  a.game.inventory.materials.scroll_A = 2;
  b.game.inventory.potions.items.push({ id: 'might', type: 'buff', name: 'Might', count: 1 });
  await createLot(a, store, { kind: 'material', ref: 'scroll_A', count: 1, price: 900 }, NOW);
  await createLot(a, store, { kind: 'material', ref: 'scroll_A', count: 1, price: 100 }, NOW);
  await createLot(b, store, { kind: 'potion', ref: 'might', count: 1, price: 500 }, NOW);

  const all = await getAuctionState(a, store, { now: NOW + HOUR });
  assert.equal(all.lots.length, 3);
  assert.equal(all.mine.length, 2);
  assert.equal(all.fee, 0.05);
  const cheap = await getAuctionState(a, store, { sort: 'cheap', now: NOW + HOUR });
  assert.deepEqual(cheap.lots.map(lot => lot.price), [100, 500, 900]);
  const potionsOnly = await getAuctionState(a, store, { kind: 'potion', now: NOW + HOUR });
  assert.deepEqual(potionsOnly.lots.map(lot => lot.kind), ['potion']);
  assert.equal(potionsOnly.lots[0].mine, false);
  assert.equal((await getAuctionState(a, store, { now: NOW + AUCTION_HOURS * HOUR + 5 })).lots.length, 0, 'expired lots are hidden');
});
