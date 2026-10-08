// Promo codes, in-game mail and hello popups.
//
// The admin creates a promo code (rewards, start/expiry, usage limit). A player
// redeems it once; the rewards land in their mail and are claimed from there,
// the same way the Alcohol bar bot does it. Admins can also publish "hello"
// popups shown when the Mini App opens.

import PromoCode from '../db/models/PromoCode.js';
import HelloNotice from '../db/models/HelloNotice.js';

export const MAIL_LIFETIME_MS = 180 * 24 * 3600_000;
const MAX_MAIL = 100;
const MAX_REWARDS = 10;
const MAX_REWARD_AMOUNT = 100_000_000;
const MAX_NOTICES = 50;

export const REWARD_KINDS = Object.freeze({
  gold: { label: 'золота', icon: '🪙' },
  crystals: { label: 'кристаллов', icon: '💎' },
  luckCoins: { label: 'монет удачи', icon: '🍀' },
  ironOre: { label: 'железной руды', icon: '⛏️' },
  bonusChances: { label: 'попыток бонуса', icon: '🎁' },
});

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const cleanCode = code => (typeof code === 'string' ? code.trim().toUpperCase() : '');

function parseTime(value) {
  if (value === null || value === undefined || value === '') return null;
  const time = typeof value === 'string' ? Date.parse(value) : Number(value);
  return Number.isSafeInteger(time) ? time : NaN;
}

/** Validates an admin form; returns `{ ok, promo }` or `{ ok: false, error }`. */
export function validatePromo(body, now = Date.now()) {
  const code = cleanCode(body?.code);
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return { ok: false, error: 'Код: 3–40 символов — буквы, цифры, _ или -.' };

  if (!Array.isArray(body?.rewards) || !body.rewards.length || body.rewards.length > MAX_REWARDS) {
    return { ok: false, error: `Нужно от 1 до ${MAX_REWARDS} наград.` };
  }
  const merged = new Map();
  for (const reward of body.rewards) {
    if (!REWARD_KINDS[reward?.kind]) return { ok: false, error: 'Неизвестный тип награды.' };
    const amount = Number(reward.amount);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_REWARD_AMOUNT) {
      return { ok: false, error: `Количество награды: целое число от 1 до ${MAX_REWARD_AMOUNT}.` };
    }
    merged.set(reward.kind, (merged.get(reward.kind) || 0) + amount);
  }
  const rewards = [...merged].map(([kind, amount]) => ({ kind, amount }));
  if (rewards.some(reward => reward.amount > MAX_REWARD_AMOUNT)) return { ok: false, error: 'Слишком большая сумма награды.' };

  const startsAt = parseTime(body.startsAt) ?? now;
  const expiresAt = parseTime(body.expiresAt);
  if (Number.isNaN(startsAt) || Number.isNaN(expiresAt)) return { ok: false, error: 'Некорректная дата.' };
  if (expiresAt !== null && (expiresAt <= now || expiresAt <= startsAt)) return { ok: false, error: 'Срок действия должен быть в будущем и после старта.' };

  const maxUsesRaw = body.maxUses === '' || body.maxUses === undefined ? null : body.maxUses;
  const maxUses = maxUsesRaw === null ? null : Number(maxUsesRaw);
  if (maxUses !== null && (!Number.isSafeInteger(maxUses) || maxUses < 1 || maxUses > 1_000_000_000)) {
    return { ok: false, error: 'Лимит использований: целое число от 1.' };
  }
  return { ok: true, promo: { code, rewards, startsAt, expiresAt, maxUses } };
}

/** Why a promo cannot be redeemed by this user right now, or null. */
export function promoBlockReason(promo, userId, now = Date.now()) {
  if (!promo || promo.deletedAt) return 'invalid';
  if (number(promo.startsAt) > now) return 'invalid';
  if (promo.expiresAt !== null && promo.expiresAt !== undefined && number(promo.expiresAt) <= now) return 'invalid';
  if ((promo.redeemedBy || []).map(String).includes(String(userId))) return 'already_redeemed';
  if (promo.maxUses !== null && promo.maxUses !== undefined && (promo.redeemedBy || []).length >= promo.maxUses) return 'invalid';
  return null;
}

export const PROMO_ERRORS = Object.freeze({
  invalid: 'Промокод недействителен или истёк.',
  already_redeemed: 'Ты уже использовал этот промокод.',
  empty: 'Введи промокод.',
});

// ---- Mail (member.game.mailbox) ----

export function rewardsText(rewards = []) {
  return rewards.map(reward => `${REWARD_KINDS[reward.kind]?.icon || ''} ${new Intl.NumberFormat('ru-RU').format(reward.amount)} ${REWARD_KINDS[reward.kind]?.label || reward.kind}`.trim()).join(', ');
}

function ensureMailbox(session) {
  if (!session.game || typeof session.game !== 'object') session.game = {};
  if (!Array.isArray(session.game.mailbox)) session.game.mailbox = [];
  return session.game.mailbox;
}

/** Drops expired mail and keeps the box bounded. Returns true when it changed. */
export function pruneMail(session, now = Date.now()) {
  const box = ensureMailbox(session);
  const kept = box.filter(mail => number(mail.expiresAt) > now);
  const trimmed = kept.length > MAX_MAIL ? kept.slice(-MAX_MAIL) : kept;
  if (trimmed.length === box.length) return false;
  session.game.mailbox = trimmed;
  return true;
}

export function addMail(session, mail, now = Date.now()) {
  const box = ensureMailbox(session);
  if (mail.id && box.some(item => item.id === mail.id)) return false;
  box.push({
    id: mail.id || `mail:${now}:${box.length}`,
    kind: mail.kind || 'reward',
    title: mail.title || 'Письмо',
    text: mail.text || '',
    rewards: mail.rewards || [],
    status: mail.rewards?.length ? 'pending' : 'read',
    createdAt: now,
    expiresAt: now + MAIL_LIFETIME_MS,
  });
  pruneMail(session, now);
  return true;
}

export function getMailbox(session, now = Date.now()) {
  pruneMail(session, now);
  const letters = [...ensureMailbox(session)].sort((a, b) => b.createdAt - a.createdAt).map(mail => ({
    id: mail.id,
    kind: mail.kind,
    title: mail.title,
    text: mail.text,
    rewards: mail.rewards || [],
    status: mail.status,
    createdAt: mail.createdAt,
    expiresAt: mail.expiresAt,
  }));
  return { letters, pending: letters.filter(mail => mail.status === 'pending').length };
}

export function pendingMailCount(session, now = Date.now()) {
  return (session?.game?.mailbox || []).filter(mail => mail.status === 'pending' && number(mail.expiresAt) > now).length;
}

export function applyReward(session, reward) {
  const game = session.game;
  if (!game.inventory) game.inventory = {};
  if (reward.kind === 'bonusChances') {
    game.bonusChances = Math.max(0, number(game.bonusChances)) + reward.amount;
  } else if (['gold', 'crystals', 'ironOre', 'luckCoins'].includes(reward.kind)) {
    game.inventory[reward.kind] = Math.max(0, number(game.inventory[reward.kind])) + reward.amount;
  }
}

export function claimMail(session, id, now = Date.now()) {
  pruneMail(session, now);
  const mail = ensureMailbox(session).find(item => item.id === id);
  if (!mail) return { ok: false, reason: 'mail_not_found' };
  if (mail.status !== 'pending') return { ok: false, reason: 'already_claimed' };
  for (const reward of mail.rewards || []) applyReward(session, reward);
  mail.status = 'claimed';
  mail.claimedAt = now;
  return { ok: true, message: `Получено: ${rewardsText(mail.rewards)}.`, mail: { id: mail.id } };
}

export function claimAllMail(session, now = Date.now()) {
  pruneMail(session, now);
  const pending = ensureMailbox(session).filter(mail => mail.status === 'pending');
  if (!pending.length) return { ok: false, reason: 'already_claimed' };
  const totals = new Map();
  for (const mail of pending) {
    for (const reward of mail.rewards || []) {
      applyReward(session, reward);
      totals.set(reward.kind, (totals.get(reward.kind) || 0) + reward.amount);
    }
    mail.status = 'claimed';
    mail.claimedAt = now;
  }
  return { ok: true, claimed: pending.length, message: `Получено: ${rewardsText([...totals].map(([kind, amount]) => ({ kind, amount })))}.` };
}

// ---- Promo codes (Mongo) ----

const promoDto = promo => ({
  code: promo.code,
  rewards: promo.rewards.map(({ kind, amount }) => ({ kind, amount })),
  startsAt: promo.startsAt,
  expiresAt: promo.expiresAt ?? null,
  maxUses: promo.maxUses ?? null,
  uses: (promo.redeemedBy || []).length,
  deleted: Boolean(promo.deletedAt),
});

export async function createPromo(input, createdBy) {
  try {
    await PromoCode.create({ ...input, createdBy: Number(createdBy) });
    return { ok: true };
  } catch (error) {
    if (error?.code === 11000) return { ok: false, reason: 'code_exists' };
    throw error;
  }
}

export async function listPromos() {
  const promos = await PromoCode.find({}).sort({ createdAt: -1 }).limit(200).lean();
  return promos.map(promoDto);
}

export async function deletePromo(code, now = Date.now()) {
  const result = await PromoCode.updateOne({ code: cleanCode(code), deletedAt: null }, { $set: { deletedAt: now } });
  return result.modifiedCount > 0;
}

export async function setPromoExpiry(code, expiresAt, now = Date.now()) {
  const time = parseTime(expiresAt);
  if (Number.isNaN(time) || (time !== null && time <= now)) return { ok: false, reason: 'invalid_date' };
  const result = await PromoCode.updateOne({ code: cleanCode(code), deletedAt: null }, { $set: { expiresAt: time } });
  return result.matchedCount > 0 ? { ok: true } : { ok: false, reason: 'not_found' };
}

/**
 * Atomically takes one use of a code for `userId` and puts the rewards in the
 * session's mail. The caller saves the session; call `releasePromo` if that fails.
 */
export async function redeemPromo(session, userId, rawCode, now = Date.now()) {
  const code = cleanCode(rawCode);
  if (!code) return { ok: false, reason: 'empty' };
  const taken = await PromoCode.findOneAndUpdate(
    {
      code,
      deletedAt: null,
      startsAt: { $lte: now },
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        { $or: [{ maxUses: null }, { $expr: { $lt: [{ $size: '$redeemedBy' }, '$maxUses'] } }] },
      ],
      redeemedBy: { $ne: Number(userId) },
    },
    { $addToSet: { redeemedBy: Number(userId) } },
    { new: true },
  ).lean();

  if (!taken) {
    const existing = await PromoCode.findOne({ code }).lean();
    return { ok: false, reason: promoBlockReason(existing, userId, now) || 'invalid' };
  }

  addMail(session, {
    id: `promo:${code}`,
    kind: 'promo',
    title: `Промокод ${code}`,
    text: 'Награда за промокод ждёт тебя в почте.',
    rewards: taken.rewards.map(({ kind, amount }) => ({ kind, amount })),
  }, now);
  return { ok: true, code, rewards: taken.rewards, message: `Промокод принят! Награда в почте: ${rewardsText(taken.rewards)}.` };
}

export async function releasePromo(code, userId) {
  await PromoCode.updateOne({ code: cleanCode(code) }, { $pull: { redeemedBy: Number(userId) } });
}

// ---- Hello popups ----

const noticeDto = notice => ({
  id: String(notice._id),
  title: notice.title,
  body: notice.body,
  active: notice.active,
  startsAt: notice.startsAt ?? null,
  endsAt: notice.endsAt ?? null,
  updatedAt: new Date(notice.updatedAt || notice.createdAt || 0).getTime(),
});

export function validateNotice(body, now = Date.now()) {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const text = typeof body?.body === 'string' ? body.body.trim() : '';
  if (!title || title.length > 80) return { ok: false, error: 'Заголовок: 1–80 символов.' };
  if (!text || text.length > 1000) return { ok: false, error: 'Текст: 1–1000 символов.' };
  const startsAt = parseTime(body.startsAt);
  const endsAt = parseTime(body.endsAt);
  if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) return { ok: false, error: 'Некорректная дата.' };
  if (endsAt !== null && endsAt <= now) return { ok: false, error: 'Окончание должно быть в будущем.' };
  if (startsAt !== null && endsAt !== null && startsAt >= endsAt) return { ok: false, error: 'Старт должен быть раньше окончания.' };
  return { ok: true, notice: { title, body: text, active: body.active !== false, startsAt, endsAt } };
}

export async function listNotices() {
  return (await HelloNotice.find({}).sort({ createdAt: -1 }).limit(MAX_NOTICES).lean()).map(noticeDto);
}

export async function saveNotice(id, notice, createdBy) {
  if (id) {
    if (!/^[a-f0-9]{24}$/i.test(String(id))) return { ok: false, reason: 'not_found' };
    const updated = await HelloNotice.findByIdAndUpdate(id, { $set: notice }, { new: true }).lean();
    return updated ? { ok: true } : { ok: false, reason: 'not_found' };
  }
  if (await HelloNotice.countDocuments({}) >= MAX_NOTICES) return { ok: false, reason: 'too_many' };
  await HelloNotice.create({ ...notice, createdBy: Number(createdBy) });
  return { ok: true };
}

export async function deleteNotice(id) {
  if (!/^[a-f0-9]{24}$/i.test(String(id))) return false;
  return (await HelloNotice.deleteOne({ _id: id })).deletedCount > 0;
}

/** What players see: active notices inside their window, no staff fields. */
export async function activeNotices(now = Date.now()) {
  const notices = await HelloNotice.find({
    active: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] },
    ],
  }).sort({ createdAt: -1 }).limit(5).lean();
  return notices.map(noticeDto).map(({ id, title, body, updatedAt }) => ({ id, title, body, updatedAt }));
}
