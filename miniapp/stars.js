// Buying crystals with Telegram Stars (currency "XTR").
//
// Flow: the Mini App asks for an invoice (createStarInvoice) -> opens it in Telegram ->
// Telegram sends a pre_checkout_query (checkPreCheckout, answered within 10 s) -> after
// payment a successful_payment message arrives (settlePayment) -> crystals are credited.
//
// Money rules: every purchase is a ledger document (db/models/StarPurchase.js); a payment is
// recognised once, by Telegram's charge id; crediting is retried on startup if the process
// died halfway (reconcileStarPurchases); purchased crystals are shielded from raids for a week.
import { addStarShield, removeFromStarShield, starShieldAmount } from '../functions/game/builds/starShield.js';

export const STARS_CURRENCY = 'XTR';
export const CRYSTALS_PER_STAR = 10;            // base rate of the smallest pack; bigger packs add a bonus
export const FIRST_PURCHASE_BONUS_CAP = 2000;   // extra crystals on a player's first purchase: min(pack, cap)
export const INVOICE_TTL_MS = 60 * 60 * 1000;
export const MAX_PENDING_INVOICES = 5;

export const STAR_PACKS = Object.freeze([
  { id: 'pouch', title: 'Горсть кристаллов', stars: 25, crystals: 250 },
  { id: 'sack', title: 'Мешочек кристаллов', stars: 50, crystals: 550 },
  { id: 'casket', title: 'Шкатулка кристаллов', stars: 100, crystals: 1200 },
  { id: 'chest', title: 'Сундук кристаллов', stars: 250, crystals: 3250 },
  { id: 'trove', title: 'Сокровищница', stars: 500, crystals: 7000 },
  { id: 'vault', title: 'Хранилище кристаллов', stars: 1000, crystals: 15000 },
].map(Object.freeze));

export const packById = id => STAR_PACKS.find(pack => pack.id === id) || null;
export const bonusPercent = pack => Math.round((pack.crystals / (pack.stars * CRYSTALS_PER_STAR) - 1) * 100);
export const firstPurchaseBonus = pack => Math.min(pack.crystals, FIRST_PURCHASE_BONUS_CAP);

/** What the Mini App shows: the ladder, the first-purchase offer and the raid shield. */
export function getStarsState(session, { hasPaid = false, now = Date.now() } = {}) {
  const game = session?.game;
  const shield = starShieldAmount(game, now);
  return {
    currency: STARS_CURRENCY,
    packs: STAR_PACKS.map(pack => ({
      id: pack.id,
      title: pack.title,
      stars: pack.stars,
      crystals: pack.crystals,
      bonusPercent: bonusPercent(pack),
      firstBonus: hasPaid ? 0 : firstPurchaseBonus(pack),
    })),
    firstPurchase: !hasPaid,
    shield: shield > 0 ? { amount: shield, until: Number(game.starShield.until) } : null,
  };
}

/** Creates the ledger entry and the invoice link for one pack. */
export async function createStarInvoice({ store, api, chatId, userId, packId, now = Date.now() }) {
  const pack = packById(packId);
  if (!pack) return { ok: false, reason: 'unknown_pack' };
  if (await store.countPending(chatId, userId, now) >= MAX_PENDING_INVOICES) return { ok: false, reason: 'too_many_pending' };

  const purchase = await store.create({ chatId, userId, packId: pack.id, stars: pack.stars, crystals: pack.crystals, expiresAt: new Date(now + INVOICE_TTL_MS) });
  const bonus = (await store.hasPaid(chatId, userId)) ? 0 : firstPurchaseBonus(pack);
  try {
    const url = await api.createInvoiceLink({
      title: pack.title,
      description: `${pack.crystals} кристаллов в игре WhitesLove${bonus ? ` и бонус первой покупки +${bonus}` : ''}. Зачислим в этот игровой чат. Купленные кристаллы 7 дней защищены от ограбления.`,
      payload: String(purchase.id),
      provider_token: '',
      currency: STARS_CURRENCY,
      prices: [{ label: pack.title, amount: pack.stars }],
    });
    return { ok: true, url, purchaseId: String(purchase.id), pack: { id: pack.id, stars: pack.stars, crystals: pack.crystals }, bonus };
  } catch (error) {
    await store.remove(purchase.id);
    return { ok: false, reason: 'invoice_failed', error };
  }
}

function sameMoney(purchase, { currency, total_amount }, fromId) {
  return purchase
    && String(purchase.userId) === String(fromId)
    && currency === STARS_CURRENCY
    && Number(total_amount) === purchase.stars;
}

/** Decides a pre_checkout_query: {ok:true} or {ok:false, error} (shown to the buyer). */
export async function checkPreCheckout(query, { store, now = Date.now() }) {
  const purchase = await store.findById(query.invoice_payload);
  if (!sameMoney(purchase, query, query.from?.id)) return { ok: false, error: 'Счёт не найден или не совпадает с заказом. Открой магазин и создай его заново.' };
  if (purchase.status !== 'pending') return { ok: false, error: 'Этот счёт уже оплачен.' };
  if (new Date(purchase.expiresAt).getTime() < now) return { ok: false, error: 'Счёт устарел. Открой магазин и создай его заново.' };
  return { ok: true };
}

async function credit(purchase, deps, now) {
  await deps.withLock(String(purchase.chatId), async () => {
    const fresh = await deps.store.findById(purchase.id);
    if (!fresh || fresh.credited || fresh.status !== 'paid') return;
    const session = await deps.getSession(fresh.chatId, fresh.userId);
    const total = fresh.crystals + (fresh.bonusCrystals || 0);
    const inventory = session.game.inventory;
    inventory.crystals = (Number(inventory.crystals) || 0) + total;
    addStarShield(session.game, total, now);
    await deps.saveSession(session);
    await deps.store.markCredited(fresh.id);
  });
}

/**
 * Handles message.successful_payment. Idempotent: a repeated update for the same charge
 * only retries crediting. Returns {ok, purchase?, total?, duplicate?}.
 */
export async function settlePayment(message, deps) {
  const now = deps.now ?? Date.now();
  const payment = message.successful_payment;
  const purchase = await deps.store.findById(payment.invoice_payload);
  if (!sameMoney(purchase, payment, message.from?.id)) {
    console.error('[stars] payment does not match an order, needs manual review:', payment.telegram_payment_charge_id, payment.invoice_payload);
    return { ok: false, reason: 'unknown_order' };
  }

  const known = await deps.store.findByCharge(payment.telegram_payment_charge_id);
  if (known) {
    await credit(known, deps, now);
    return { ok: true, duplicate: true, purchase: known };
  }

  const paid = await deps.store.markPaid(purchase.id, {
    chargeId: payment.telegram_payment_charge_id,
    providerChargeId: payment.provider_payment_charge_id,
    now,
  });
  if (!paid) return { ok: false, reason: 'already_settled' };

  // The bonus is decided inside the chat lock, so two simultaneous first payments cannot both get it.
  await deps.withLock(String(paid.chatId), async () => {
    const bonus = (await deps.store.hasPaidBefore(paid)) ? 0 : firstPurchaseBonus(paid);
    if (bonus) await deps.store.setBonus(paid.id, bonus);
  });
  const settled = await deps.store.findById(paid.id);
  await credit(settled, deps, now);
  const total = settled.crystals + (settled.bonusCrystals || 0);
  if (deps.notify) await deps.notify(settled.userId, settled, total).catch(() => {});
  return { ok: true, purchase: settled, total };
}

/** Startup safety net: paid but not credited (the process died between the two steps). */
export async function reconcileStarPurchases(deps) {
  const stuck = await deps.store.listUncredited();
  for (const purchase of stuck) await credit(purchase, deps, deps.now ?? Date.now());
  return stuck.length;
}

/** Admin refund: returns the Stars through Telegram, then takes the crystals back (never below 0). */
export async function refundStarPurchase(chargeId, deps) {
  const purchase = await deps.store.findByCharge(chargeId);
  if (!purchase) return { ok: false, reason: 'not_found' };
  if (purchase.status === 'refunded') return { ok: false, reason: 'already_refunded' };
  await deps.api.refundStarPayment({ user_id: purchase.userId, telegram_payment_charge_id: chargeId });
  await deps.withLock(String(purchase.chatId), async () => {
    const session = await deps.getSession(purchase.chatId, purchase.userId);
    const total = purchase.crystals + (purchase.bonusCrystals || 0);
    const inventory = session.game.inventory;
    inventory.crystals = Math.max(0, (Number(inventory.crystals) || 0) - total);
    removeFromStarShield(session.game, total);
    await deps.saveSession(session);
    await deps.store.markRefunded(purchase.id);
  });
  return { ok: true, purchase };
}

/** MongoDB-backed ledger; the model is imported lazily so unit tests need no database. */
export async function mongoStarStore() {
  const { default: StarPurchase } = await import('../db/models/StarPurchase.js');
  const plain = doc => (doc ? { ...doc, id: String(doc._id) } : null);
  const validId = id => /^[0-9a-f]{24}$/i.test(String(id));
  return {
    async create(fields) { return plain((await StarPurchase.create(fields)).toObject()); },
    async remove(id) { await StarPurchase.deleteOne({ _id: id }); },
    async findById(id) { return validId(id) ? plain(await StarPurchase.findById(id).lean()) : null; },
    async findByCharge(chargeId) { return plain(await StarPurchase.findOne({ chargeId }).lean()); },
    countPending(chatId, userId, now) { return StarPurchase.countDocuments({ chatId, userId, status: 'pending', expiresAt: { $gt: new Date(now) } }); },
    async hasPaid(chatId, userId) { return Boolean(await StarPurchase.exists({ chatId, userId, status: { $in: ['paid', 'refunded'] } })); },
    async hasPaidBefore(purchase) {
      return Boolean(await StarPurchase.exists({ chatId: purchase.chatId, userId: purchase.userId, _id: { $ne: purchase._id }, status: { $in: ['paid', 'refunded'] } }));
    },
    async markPaid(id, { chargeId, providerChargeId, now }) {
      return plain(await StarPurchase.findOneAndUpdate({ _id: id, status: 'pending' }, { $set: { status: 'paid', chargeId, providerChargeId, paidAt: new Date(now) } }, { new: true }).lean());
    },
    async setBonus(id, bonusCrystals) { await StarPurchase.updateOne({ _id: id }, { $set: { bonusCrystals } }); },
    async markCredited(id) { await StarPurchase.updateOne({ _id: id }, { $set: { credited: true } }); },
    async markRefunded(id) { await StarPurchase.updateOne({ _id: id }, { $set: { status: 'refunded', refundedAt: new Date() } }); },
    async listUncredited() { return (await StarPurchase.find({ status: 'paid', credited: false }).lean()).map(plain); },
  };
}
