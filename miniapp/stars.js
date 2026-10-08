// Buying Coins of Luck (the donation currency) with Telegram Stars (currency "XTR").
//
// Flow: the Mini App asks for an invoice (createStarInvoice) -> opens it in Telegram ->
// Telegram sends a pre_checkout_query (checkPreCheckout, answered within 10 s) -> after
// payment a successful_payment message arrives (settlePayment) -> the coins are credited.
//
// Money rules: every purchase is a ledger document (db/models/StarPurchase.js); a payment is
// recognised once, by Telegram's charge id; crediting is retried on startup if the process
// died halfway (reconcileStarPurchases). Coins of Luck cannot be raided; the crystals bought with
// them in the Luck shop are shielded for a week. Purchases made before Coins of Luck existed
// carry currency 'crystals' and are still credited and refunded as crystals.
import { addStarShield, removeFromStarShield, starShieldAmount } from '../functions/game/builds/starShield.js';

export const STARS_CURRENCY = 'XTR';
export const LUCK_COINS = 'luckCoins';
export const COINS_PER_STAR = 1;                // base rate of the smallest pack; bigger packs add a bonus
export const FIRST_PURCHASE_BONUS_CAP = 200;    // extra coins on a player's first purchase: min(pack, cap)
export const INVOICE_TTL_MS = 60 * 60 * 1000;
export const MAX_PENDING_INVOICES = 5;

export const STAR_PACKS = Object.freeze([
  { id: 'pouch', title: 'Горсть монет удачи', stars: 25, coins: 25 },
  { id: 'sack', title: 'Мешочек монет удачи', stars: 50, coins: 55 },
  { id: 'casket', title: 'Шкатулка монет удачи', stars: 100, coins: 120 },
  { id: 'chest', title: 'Сундук монет удачи', stars: 250, coins: 325 },
  { id: 'trove', title: 'Сокровищница удачи', stars: 500, coins: 700 },
  { id: 'vault', title: 'Хранилище удачи', stars: 1000, coins: 1500 },
].map(Object.freeze));

export const packById = id => STAR_PACKS.find(pack => pack.id === id) || null;
export const bonusPercent = pack => Math.round((pack.coins / (pack.stars * COINS_PER_STAR) - 1) * 100);
export const firstPurchaseBonus = pack => Math.min(pack.coins, FIRST_PURCHASE_BONUS_CAP);

/** What a ledger row pays out: its currency, base amount, first-purchase bonus and the total. */
export function purchaseAmount(purchase) {
  const coins = purchase?.currency === LUCK_COINS;
  const base = Number(coins ? purchase.coins : purchase?.crystals) || 0;
  const bonus = Number(coins ? purchase.bonusCoins : purchase?.bonusCrystals) || 0;
  return { currency: coins ? LUCK_COINS : 'crystals', base, bonus, total: base + bonus };
}

/** What the Mini App shows: the ladder, the first-purchase offer and the raid shield (of crystals bought with coins). */
export function getStarsState(session, { hasPaid = false, now = Date.now() } = {}) {
  const game = session?.game;
  const shield = starShieldAmount(game, now);
  return {
    currency: STARS_CURRENCY,
    packs: STAR_PACKS.map(pack => ({
      id: pack.id,
      title: pack.title,
      stars: pack.stars,
      coins: pack.coins,
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

  const purchase = await store.create({ chatId, userId, packId: pack.id, stars: pack.stars, currency: LUCK_COINS, coins: pack.coins, expiresAt: new Date(now + INVOICE_TTL_MS) });
  const bonus = (await store.hasPaid(chatId, userId)) ? 0 : firstPurchaseBonus(pack);
  try {
    const url = await api.createInvoiceLink({
      title: pack.title,
      description: `${pack.coins} монет удачи в игре WhitesLove${bonus ? ` и бонус первой покупки +${bonus}` : ''}. Зачислим в этот игровой чат.`,
      payload: String(purchase.id),
      provider_token: '',
      currency: STARS_CURRENCY,
      prices: [{ label: pack.title, amount: pack.stars }],
    });
    return { ok: true, url, purchaseId: String(purchase.id), pack: { id: pack.id, stars: pack.stars, coins: pack.coins }, bonus };
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
    const { currency, total } = purchaseAmount(fresh);
    const inventory = session.game.inventory;
    if (currency === LUCK_COINS) {
      inventory.luckCoins = (Number(inventory.luckCoins) || 0) + total;
    } else {
      inventory.crystals = (Number(inventory.crystals) || 0) + total;
      addStarShield(session.game, total, now);
    }
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
    const { currency, base } = purchaseAmount(paid);
    const bonus = (await deps.store.hasPaidBefore(paid)) ? 0 : Math.min(base, FIRST_PURCHASE_BONUS_CAP);
    if (bonus) await deps.store.setBonus(paid.id, bonus, currency);
  });
  const settled = await deps.store.findById(paid.id);
  await credit(settled, deps, now);
  const { total } = purchaseAmount(settled);
  if (deps.notify) await deps.notify(settled.userId, settled, total).catch(() => {});
  return { ok: true, purchase: settled, total };
}

/** Startup safety net: paid but not credited (the process died between the two steps). */
export async function reconcileStarPurchases(deps) {
  const stuck = await deps.store.listUncredited();
  for (const purchase of stuck) await credit(purchase, deps, deps.now ?? Date.now());
  return stuck.length;
}

/** Admin refund: returns the Stars through Telegram, then takes the coins (or legacy crystals) back, never below 0. */
export async function refundStarPurchase(chargeId, deps) {
  const purchase = await deps.store.findByCharge(chargeId);
  if (!purchase) return { ok: false, reason: 'not_found' };
  if (purchase.status === 'refunded') return { ok: false, reason: 'already_refunded' };
  await deps.api.refundStarPayment({ user_id: purchase.userId, telegram_payment_charge_id: chargeId });
  await deps.withLock(String(purchase.chatId), async () => {
    const session = await deps.getSession(purchase.chatId, purchase.userId);
    const { currency, total } = purchaseAmount(purchase);
    const inventory = session.game.inventory;
    if (currency === LUCK_COINS) {
      inventory.luckCoins = Math.max(0, (Number(inventory.luckCoins) || 0) - total);
    } else {
      inventory.crystals = Math.max(0, (Number(inventory.crystals) || 0) - total);
      removeFromStarShield(session.game, total);
    }
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
    async setBonus(id, bonus, currency = 'crystals') {
      await StarPurchase.updateOne({ _id: id }, { $set: currency === LUCK_COINS ? { bonusCoins: bonus } : { bonusCrystals: bonus } });
    },
    async markCredited(id) { await StarPurchase.updateOne({ _id: id }, { $set: { credited: true } }); },
    async markRefunded(id) { await StarPurchase.updateOne({ _id: id }, { $set: { status: 'refunded', refundedAt: new Date() } }); },
    async listUncredited() { return (await StarPurchase.find({ status: 'paid', credited: false }).lean()).map(plain); },
  };
}
