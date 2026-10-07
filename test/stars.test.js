import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STAR_PACKS, CRYSTALS_PER_STAR, FIRST_PURCHASE_BONUS_CAP, MAX_PENDING_INVOICES, INVOICE_TTL_MS,
  bonusPercent, firstPurchaseBonus, getStarsState, createStarInvoice, checkPreCheckout, settlePayment,
  reconcileStarPurchases, refundStarPurchase,
} from '../miniapp/stars.js';
import { starShieldAmount, addStarShield, STAR_SHIELD_MS } from '../functions/game/builds/starShield.js';
import { stealableCrystals } from '../functions/game/builds/stealResources.js';

const NOW = Date.UTC(2026, 9, 7, 12);
const calls = {};

function memoryStore() {
  const rows = new Map();
  let seq = 0;
  const copy = row => (row ? { ...row, id: row._id } : null);
  return {
    rows,
    async create(fields) { const _id = `p${++seq}`; rows.set(_id, { _id, status: 'pending', credited: false, bonusCrystals: 0, ...fields }); return copy(rows.get(_id)); },
    async remove(id) { rows.delete(id); },
    async findById(id) { return copy(rows.get(id)); },
    async findByCharge(chargeId) { return copy([...rows.values()].find(r => r.chargeId === chargeId)); },
    async countPending(chatId, userId, now) { return [...rows.values()].filter(r => r.chatId === chatId && r.userId === userId && r.status === 'pending' && new Date(r.expiresAt) > now).length; },
    async hasPaid(chatId, userId) { return [...rows.values()].some(r => r.chatId === chatId && r.userId === userId && ['paid', 'refunded'].includes(r.status)); },
    async hasPaidBefore(p) { return [...rows.values()].some(r => r.chatId === p.chatId && r.userId === p.userId && r._id !== p._id && ['paid', 'refunded'].includes(r.status)); },
    async markPaid(id, { chargeId, providerChargeId, now }) {
      const row = rows.get(id);
      if (!row || row.status !== 'pending') return null;
      Object.assign(row, { status: 'paid', chargeId, providerChargeId, paidAt: new Date(now) });
      return copy(row);
    },
    async setBonus(id, bonusCrystals) { rows.get(id).bonusCrystals = bonusCrystals; },
    async markCredited(id) { rows.get(id).credited = true; },
    async markRefunded(id) { Object.assign(rows.get(id), { status: 'refunded' }); },
    async listUncredited() { return [...rows.values()].filter(r => r.status === 'paid' && !r.credited).map(copy); },
  };
}

function world(crystals = 100) {
  const session = { game: { inventory: { gold: 0, crystals, ironOre: 0 } } };
  const sent = [];
  const deps = {
    store: memoryStore(),
    now: NOW,
    withLock: async (_key, action) => action(),
    getSession: async () => session,
    saveSession: async () => {},
    api: {
      createInvoiceLink: async params => { calls.invoice = params; return `https://t.me/$invoice-${params.payload}`; },
      refundStarPayment: async params => { calls.refund = params; return true; },
    },
    notify: async (userId, purchase, total) => { sent.push({ userId, total }); },
  };
  return { session, sent, deps };
}

const payment = (purchase, overrides = {}) => ({
  from: { id: purchase.userId },
  successful_payment: { currency: 'XTR', total_amount: purchase.stars, invoice_payload: purchase.id, telegram_payment_charge_id: 'charge-1', provider_payment_charge_id: 'prov-1', ...overrides },
});

test('pack ladder: more Stars always give more crystals per Star, starting at the base rate', () => {
  assert.equal(STAR_PACKS[0].crystals, STAR_PACKS[0].stars * CRYSTALS_PER_STAR, 'smallest pack has no bonus');
  let previous = 0;
  for (const pack of STAR_PACKS) {
    const rate = pack.crystals / pack.stars;
    assert.ok(rate > previous, `${pack.id} must be a better deal than the pack below it`);
    previous = rate;
    assert.ok(Number.isInteger(pack.stars) && pack.stars >= 1 && pack.stars <= 10000, 'valid XTR amount');
    assert.ok(pack.title.length <= 32, 'invoice title limit');
  }
  assert.deepEqual(STAR_PACKS.map(bonusPercent), [0, 10, 20, 30, 40, 50]);
  assert.equal(new Set(STAR_PACKS.map(pack => pack.id)).size, STAR_PACKS.length);
});

test('first purchase bonus doubles small packs and is capped on big ones', () => {
  assert.equal(firstPurchaseBonus(STAR_PACKS[0]), 250);
  assert.equal(firstPurchaseBonus(STAR_PACKS.at(-1)), FIRST_PURCHASE_BONUS_CAP);
});

test('state lists the packs, the first-purchase offer and an active shield', () => {
  const session = { game: { starShield: { amount: 500, until: NOW + 1000 } } };
  const state = getStarsState(session, { hasPaid: false, now: NOW });
  assert.equal(state.packs.length, STAR_PACKS.length);
  assert.equal(state.firstPurchase, true);
  assert.equal(state.packs[0].firstBonus, 250);
  assert.deepEqual(state.shield, { amount: 500, until: NOW + 1000 });
  const paid = getStarsState({ game: {} }, { hasPaid: true, now: NOW });
  assert.equal(paid.packs[0].firstBonus, 0);
  assert.equal(paid.shield, null);
});

test('invoice: XTR currency, one price line, payload is the ledger id, bonus announced', async () => {
  const { deps } = world();
  const result = await createStarInvoice({ ...deps, chatId: -1001, userId: 7, packId: 'casket', now: NOW });
  assert.equal(result.ok, true);
  assert.match(result.url, /^https:\/\/t\.me\//);
  assert.equal(result.bonus, 1200);
  const sent = calls.invoice;
  assert.equal(sent.currency, 'XTR');
  assert.equal(sent.provider_token, '');
  assert.deepEqual(sent.prices, [{ label: 'Шкатулка кристаллов', amount: 100 }]);
  assert.ok(Buffer.byteLength(sent.payload) <= 128 && sent.description.length <= 255 && sent.title.length <= 32);
  const row = await deps.store.findById(sent.payload);
  assert.deepEqual([row.chatId, row.userId, row.stars, row.crystals, row.status], [-1001, 7, 100, 1200, 'pending']);
  assert.equal(new Date(row.expiresAt).getTime(), NOW + INVOICE_TTL_MS);
});

test('invoice rejects unknown packs, floods of pending invoices, and cleans up when Telegram fails', async () => {
  const { deps } = world();
  assert.equal((await createStarInvoice({ ...deps, chatId: 1, userId: 1, packId: 'free-gems', now: NOW })).reason, 'unknown_pack');
  for (let i = 0; i < MAX_PENDING_INVOICES; i++) assert.equal((await createStarInvoice({ ...deps, chatId: 1, userId: 1, packId: 'pouch', now: NOW })).ok, true);
  assert.equal((await createStarInvoice({ ...deps, chatId: 1, userId: 1, packId: 'pouch', now: NOW })).reason, 'too_many_pending');
  assert.equal((await createStarInvoice({ ...deps, chatId: 1, userId: 2, packId: 'pouch', now: NOW })).ok, true, 'limit is per player');

  const failing = world();
  failing.deps.api.createInvoiceLink = async () => { throw new Error('Bad Request'); };
  const before = failing.deps.store.rows.size;
  assert.equal((await createStarInvoice({ ...failing.deps, chatId: 1, userId: 1, packId: 'pouch', now: NOW })).reason, 'invoice_failed');
  assert.equal(failing.deps.store.rows.size, before, 'no orphan ledger row');
});

test('pre-checkout accepts only the buyer, the exact amount in XTR, a pending and fresh order', async () => {
  const { deps } = world();
  const { purchaseId } = await createStarInvoice({ ...deps, chatId: 1, userId: 7, packId: 'sack', now: NOW });
  const query = (over = {}) => ({ from: { id: 7 }, currency: 'XTR', total_amount: 50, invoice_payload: purchaseId, ...over });
  assert.deepEqual(await checkPreCheckout(query(), deps), { ok: true });
  assert.equal((await checkPreCheckout(query({ from: { id: 8 } }), deps)).ok, false, 'someone else cannot pay your order');
  assert.equal((await checkPreCheckout(query({ total_amount: 1 }), deps)).ok, false, 'tampered amount');
  assert.equal((await checkPreCheckout(query({ currency: 'USD' }), deps)).ok, false);
  assert.equal((await checkPreCheckout(query({ invoice_payload: 'nope' }), deps)).ok, false);
  assert.equal((await checkPreCheckout(query(), { ...deps, now: NOW + INVOICE_TTL_MS + 1 })).ok, false, 'expired');
});

test('payment credits crystals + first bonus once, shields them and notifies', async () => {
  const w = world(100);
  const { purchaseId } = await createStarInvoice({ ...w.deps, chatId: 1, userId: 7, packId: 'sack', now: NOW });
  const result = await settlePayment(payment({ id: purchaseId, userId: 7, stars: 50 }), w.deps);
  assert.equal(result.ok, true);
  assert.equal(result.total, 550 + 550);
  assert.equal(w.session.game.inventory.crystals, 100 + 1100);
  assert.equal(starShieldAmount(w.session.game, NOW), 1100);
  assert.equal(w.session.game.starShield.until, NOW + STAR_SHIELD_MS);
  assert.deepEqual(w.sent, [{ userId: 7, total: 1100 }]);
  const row = await w.deps.store.findById(purchaseId);
  assert.deepEqual([row.status, row.credited, row.bonusCrystals, row.chargeId], ['paid', true, 550, 'charge-1']);
});

test('the same payment delivered twice credits only once', async () => {
  const w = world(0);
  const { purchaseId } = await createStarInvoice({ ...w.deps, chatId: 1, userId: 7, packId: 'pouch', now: NOW });
  const message = payment({ id: purchaseId, userId: 7, stars: 25 });
  await settlePayment(message, w.deps);
  const again = await settlePayment(message, w.deps);
  assert.equal(again.duplicate, true);
  assert.equal(w.session.game.inventory.crystals, 250 + 250);
});

test('the second purchase gets no first-purchase bonus', async () => {
  const w = world(0);
  const first = await createStarInvoice({ ...w.deps, chatId: 1, userId: 7, packId: 'pouch', now: NOW });
  const second = await createStarInvoice({ ...w.deps, chatId: 1, userId: 7, packId: 'pouch', now: NOW });
  await settlePayment(payment({ id: first.purchaseId, userId: 7, stars: 25 }, { telegram_payment_charge_id: 'c1' }), w.deps);
  await settlePayment(payment({ id: second.purchaseId, userId: 7, stars: 25 }, { telegram_payment_charge_id: 'c2' }), w.deps);
  assert.equal(w.session.game.inventory.crystals, 500 + 250);
  assert.equal((await w.deps.store.findById(second.purchaseId)).bonusCrystals, 0);
});

test('a payment that does not match its order is never credited', async () => {
  const w = world(0);
  const { purchaseId } = await createStarInvoice({ ...w.deps, chatId: 1, userId: 7, packId: 'sack', now: NOW });
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.equal((await settlePayment(payment({ id: purchaseId, userId: 8, stars: 50 }), w.deps)).reason, 'unknown_order');
    assert.equal((await settlePayment(payment({ id: purchaseId, userId: 7, stars: 50 }, { total_amount: 5 }), w.deps)).reason, 'unknown_order');
  } finally { console.error = originalError; }
  assert.equal(w.session.game.inventory.crystals, 0);
});

test('a crash between "paid" and "credited" is repaired on the next start', async () => {
  const w = world(0);
  const { purchaseId } = await createStarInvoice({ ...w.deps, chatId: 1, userId: 7, packId: 'pouch', now: NOW });
  const crashing = { ...w.deps, saveSession: async () => { throw new Error('mongo down'); } };
  await assert.rejects(settlePayment(payment({ id: purchaseId, userId: 7, stars: 25 }), crashing));
  assert.equal((await w.deps.store.findById(purchaseId)).credited, false);
  w.session.game.inventory.crystals = 0;
  assert.equal(await reconcileStarPurchases(w.deps), 1);
  assert.equal(w.session.game.inventory.crystals, 250 + 250);
  assert.equal(await reconcileStarPurchases(w.deps), 0, 'nothing left to repair');
});

test('refund returns the Stars and takes the crystals back, never below zero', async () => {
  const w = world(0);
  const { purchaseId } = await createStarInvoice({ ...w.deps, chatId: 1, userId: 7, packId: 'pouch', now: NOW });
  await settlePayment(payment({ id: purchaseId, userId: 7, stars: 25 }), w.deps);
  w.session.game.inventory.crystals = 100;
  const result = await refundStarPurchase('charge-1', w.deps);
  assert.equal(result.ok, true);
  assert.deepEqual(calls.refund, { user_id: 7, telegram_payment_charge_id: 'charge-1' });
  assert.equal(w.session.game.inventory.crystals, 0);
  assert.equal(starShieldAmount(w.session.game, NOW), 0);
  assert.equal((await w.deps.store.findById(purchaseId)).status, 'refunded');
  assert.equal((await refundStarPurchase('charge-1', w.deps)).reason, 'already_refunded');
  assert.equal((await refundStarPurchase('nope', w.deps)).reason, 'not_found');
});

test('raids cannot take shielded crystals but still take the unshielded rest', () => {
  const game = {};
  assert.equal(stealableCrystals(10000, 300, game, NOW), 9700, 'no shield: only the palace guard applies');
  addStarShield(game, 4000, NOW);
  assert.equal(stealableCrystals(10000, 300, game, NOW), 5700, 'shield and guard both stay out of reach');
  assert.equal(stealableCrystals(4000, 0, game, NOW), 0, 'a fully shielded stash is untouchable');
  assert.equal(stealableCrystals(10000, 300, game, NOW + STAR_SHIELD_MS + 1), 9700, 'an expired shield protects nothing');
});
