import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUCTION_HOURS, MAX_ACTIVE_LOTS, buyLot, cancelLot, createLot, feeFor, getAuctionState, returnExpiredLots, sellableItems, settleSales, deliverToSeller, sweepAuction,
} from '../miniapp/auction.js';
import { getCatalog, instantiate } from '../functions/game/equipment/catalog.js';
import { getMaterialCount } from '../functions/game/player/materials.js';
import { grantTimedItem } from '../functions/game/equipment/timedItems.js';
import { claimMail, getMailbox } from '../miniapp/promo.js';

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
    async listActive() { return [...lots.values()].filter(lot => lot.status === 'active').map(copy); },
    async listUnpaid(sellerId) { return [...lots.values()].filter(lot => lot.sellerId === sellerId && lot.status === 'sold' && lot.paidOut === false).map(copy); },
    async claimPayout(id) { const lot = lots.get(id); if (!lot || lot.status !== 'sold' || lot.paidOut !== false) return null; lot.paidOut = true; return copy(lot); },
    async listBySeller(chatId, sellerId) { return [...lots.values()].filter(lot => lot.chatId === chatId && lot.sellerId === sellerId && lot.status === 'active').map(copy); },
    async countActiveBySeller(sellerId) { return [...lots.values()].filter(lot => lot.sellerId === sellerId && lot.status === 'active').length; },
    async listExpired(sellerId, now) { return [...lots.values()].filter(lot => lot.sellerId === sellerId && lot.status === 'active' && lot.expiresAt <= now).map(copy); },
    async listAllExpired(now) { return [...lots.values()].filter(lot => lot.status === 'active' && lot.expiresAt <= now).map(copy); },
    async listAllUnpaid() { return [...lots.values()].filter(lot => lot.status === 'sold' && lot.paidOut === false).map(copy); },
    async unclaimPayout(id) { const lot = lots.get(id); if (lot && lot.status === 'sold') lot.paidOut = false; },
    async claim(id, from, to, extra = {}) {
      const lot = lots.get(id);
      if (!lot || lot.status !== from) return null;
      Object.assign(lot, { status: to, ...extra });
      return copy(lot);
    },
    async restore(id, status) { Object.assign(lots.get(id), { status }); for (const key of ['buyerId', 'payout', 'paidOut', 'buyerChatId']) delete lots.get(id)[key]; },
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
  assert.equal(seller.game.inventory.gold, 0, 'the adena comes by mail');
  const letter = getMailbox(seller, NOW).letters.find(entry => entry.kind === 'auction');
  assert.deepEqual(letter.rewards, [{ kind: 'gold', amount: 3800 }]);
  assert.equal(claimMail(seller, letter.id, NOW).ok, true);
  assert.equal(seller.game.inventory.gold, 3800);
  assert.equal(buyer.game.inventory.equipment.items.length, 1);
  assert.equal(buyer.game.inventory.equipment.items[0].uid, sword.uid);
  assert.equal(buyer.game.inventory.equipment.items[0].isUsed, false);

  const second = await buyLot(rival, store, lot.id, NOW + HOUR);
  assert.equal(second.reason, 'lot_gone');
  assert.equal(rival.game.inventory.gold, 10_000);
  assert.equal(rival.game.inventory.equipment.items.length, 0);
});

test('buying is refused for poor buyers, the seller and expired lots', async () => {
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
  assert.equal((await returnExpiredLots(seller, store, NOW + HOUR)).length, 0, 'not yet');
  assert.equal((await returnExpiredLots(seller, store, NOW + AUCTION_HOURS * HOUR + 1)).length, 1);
  assert.equal(getMaterialCount(seller, 'crystal_A'), 0, 'the item waits in the mail');
  const returned = getMailbox(seller, NOW + AUCTION_HOURS * HOUR + 1).letters.find(entry => entry.kind === 'auction');
  assert.equal(returned.rewards[0].kind, 'material');
  assert.equal(claimMail(seller, returned.id, NOW + AUCTION_HOURS * HOUR + 1).ok, true);
  assert.equal(getMaterialCount(seller, 'crystal_A'), 5);
  assert.equal((await returnExpiredLots(seller, store, NOW + AUCTION_HOURS * HOUR + 1)).length, 0, 'only once');
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
  assert.equal(all.lots.find(lot => lot.kind === 'material').materialKey, 'scroll_A');
  assert.deepEqual(all.lots.find(lot => lot.kind === 'potion').artPotion, {type:'buff', id:'might', size:undefined, bottleType:undefined});
  const cheap = await getAuctionState(a, store, { sort: 'cheap', now: NOW + HOUR });
  assert.deepEqual(cheap.lots.map(lot => lot.price), [100, 500, 900]);
  const potionsOnly = await getAuctionState(a, store, { kind: 'potion', now: NOW + HOUR });
  assert.deepEqual(potionsOnly.lots.map(lot => lot.kind), ['potion']);
  assert.equal(potionsOnly.lots[0].mine, false);
  assert.equal((await getAuctionState(a, store, { now: NOW + AUCTION_HOURS * HOUR + 5 })).lots.length, 0, 'expired lots are hidden');
});

test('one auction for everybody: a seller outside the buyer chat is mailed by his own chat, once', async () => {
  const store = memoryStore();
  const sellerChat = chatWith(0);
  const [seller] = sellerChat.members;
  const buyerChat = { chatId: -200, members: [] };
  const buyer = {
    userId: 9, userChatData: { user: { first_name: 'Far' } }, ownerDocument: () => buyerChat,
    game: { inventory: { gold: 10_000, equipment: { items: [] }, potions: { items: [] }, materials: {} } },
  };
  buyerChat.members.push(buyer);
  seller.game.inventory.materials.scroll_A = 2;
  const listed = await createLot(seller, store, { kind: 'material', ref: 'scroll_A', count: 2, price: 1000 }, NOW);
  assert.equal(listed.ok, true);

  const seen = await getAuctionState(buyer, store, { now: NOW });
  assert.equal(seen.lots.length, 1);
  assert.equal(seen.mine.length, 0);

  const bought = await buyLot(buyer, store, listed.lot.id, NOW);
  assert.equal(bought.ok, true);
  assert.deepEqual(bought.deferred, { chatId: -100, sellerId: 1 });
  assert.equal(buyer.game.inventory.gold, 9_000);
  assert.equal(getMaterialCount(buyer, 'scroll_A'), 2);

  let saves = 0;
  const io = { withLock: (key, action) => action(), getSession: async () => seller, saveSession: async () => { saves++; } };
  assert.equal(await deliverToSeller(store, io, bought.deferred, NOW), 1);
  assert.equal(saves, 1);
  const letter = getMailbox(seller, NOW).letters.find(entry => entry.kind === 'auction');
  assert.deepEqual(letter.rewards, [{ kind: 'gold', amount: 950 }]);
  assert.equal(await deliverToSeller(store, io, bought.deferred, NOW), 0, 'a payout is mailed only once');
  assert.equal((await buyLot(buyer, store, listed.lot.id, NOW)).reason, 'lot_gone');
});

test('a failed save of the seller returns the payout to the queue', async () => {
  const store = memoryStore();
  const [seller] = chatWith(0).members;
  const buyerChat = { chatId: -200, members: [] };
  const buyer = { userId: 9, ownerDocument: () => buyerChat, game: { inventory: { gold: 500, equipment: { items: [] }, potions: { items: [] }, materials: {} } } };
  buyerChat.members.push(buyer);
  seller.game.inventory.materials.scroll_A = 1;
  const { lot } = await createLot(seller, store, { kind: 'material', ref: 'scroll_A', price: 400 }, NOW);
  await buyLot(buyer, store, lot.id, NOW);
  const broken = { withLock: (key, action) => action(), getSession: async () => seller, saveSession: async () => { throw new Error('db down'); } };
  await assert.rejects(deliverToSeller(store, broken, { chatId: -100, sellerId: 1 }, NOW), /db down/);
  assert.equal(store.lots.get(lot.id).paidOut, false);
  const fine = { withLock: (key, action) => action(), getSession: async () => seller, saveSession: async () => {} };
  assert.equal(await sweepAuction(store, fine, NOW), 1);
  assert.equal(store.lots.get(lot.id).paidOut, true);
});

test('the sweep mails an unsold lot back to a seller who is not playing', async () => {
  const store = memoryStore();
  const [seller] = chatWith(0).members;
  seller.game.inventory.equipment.items.push(weapon());
  const sword = seller.game.inventory.equipment.items[0];
  await createLot(seller, store, { kind: 'equipment', ref: sword.uid, price: 700 }, NOW);
  assert.equal(seller.game.inventory.equipment.items.length, 0);
  const io = { withLock: (key, action) => action(), getSession: async () => seller, saveSession: async () => {} };
  assert.equal(await sweepAuction(store, io, NOW + HOUR), 0, 'not yet');
  assert.equal(await sweepAuction(store, io, NOW + AUCTION_HOURS * HOUR + 1), 1);
  const letter = getMailbox(seller, NOW + AUCTION_HOURS * HOUR + 1).letters.find(entry => entry.kind === 'auction');
  assert.equal(letter.rewards[0].kind, 'equipment');
  assert.equal(claimMail(seller, letter.id, NOW + AUCTION_HOURS * HOUR + 1).ok, true);
  assert.equal(seller.game.inventory.equipment.items[0].uid, sword.uid);
});

test('an unsold weapon waits in the mail when the bag is full', async () => {
  const store = memoryStore();
  const [seller] = chatWith(0).members;
  seller.game.inventory.equipment.items.push(weapon());
  const sword = seller.game.inventory.equipment.items[0];
  await createLot(seller, store, { kind: 'equipment', ref: sword.uid, price: 700 }, NOW);
  await returnExpiredLots(seller, store, NOW + AUCTION_HOURS * HOUR + 1);
  const letter = getMailbox(seller, NOW + AUCTION_HOURS * HOUR + 1).letters.find(entry => entry.kind === 'auction');
  for (let i = 0; i < 400; i++) seller.game.inventory.equipment.items.push(weapon());
  const refused = claimMail(seller, letter.id, NOW + AUCTION_HOURS * HOUR + 1);
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'inventory_full');
  assert.equal(getMailbox(seller, NOW + AUCTION_HOURS * HOUR + 1).letters.find(entry => entry.id === letter.id).status, 'pending');
});
