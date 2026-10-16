import { token } from '../../config.js';
import getSession from '../../functions/getters/getSession.js';
import getClan from '../../functions/game/clans/getClan.js';
import { validateTelegramInitData, resolveGameChatId } from '../telegramAuth.js';
import { createMiniAppState } from '../state.js';
import { isOwner } from '../adminAccess.js';
import { rememberLanguage } from '../language.js';
import { clanPerksStale, syncClanPerks } from '../../functions/game/clans/clanPerks.js';
import { GOLD_LOCK_REASON, goldLockForMember } from '../../functions/game/general/goldLock.js';
import { getInitData } from './request.js';
import { httpError, sendJson } from './response.js';

const RATE_WINDOW_MS = 10_000;
const RATE_MAX_REQUESTS = 60;
const rateBuckets = new Map();

export function enforceRateLimit(userId) {
  const now = Date.now();
  let bucket = rateBuckets.get(userId);
  if (!bucket || bucket.reset <= now) {
    bucket = { count: 0, reset: now + RATE_WINDOW_MS };
    rateBuckets.set(userId, bucket);
    if (rateBuckets.size > 10_000) {
      for (const [id, item] of rateBuckets) if (item.reset <= now) rateBuckets.delete(id);
    }
  }
  if (++bucket.count > RATE_MAX_REQUESTS) {
    throw httpError(429, 'Too many requests');
  }
}

export async function authorize(req) {
  const validated = validateTelegramInitData(getInitData(req), token);
  if (validated.user?.id) enforceRateLimit(validated.user.id);
  if (!validated.user?.id) {
    throw httpError(401, 'Telegram user is missing');
  }
  rememberLanguage(validated.user.id, req.headers['x-app-lang']);

  const chatId = resolveGameChatId(validated);
  const session = await getSession(chatId, validated.user.id, {persist:false});
  // Clan skills reach the stat code through the session; the copy is refreshed every few minutes
  // and persisted by whichever action saves the session next.
  if (clanPerksStale(session)) {
    try { syncClanPerks(session, await getClan(Number(validated.user.id))); } catch (error) { console.warn('[miniapp] clan perks sync:', error.message); }
  }
  const isGroupContext = String(chatId) !== String(validated.user.id);
  const membershipStatus = session.userChatData?.status || session.$locals?.telegramMembership?.status;
  if (isGroupContext && ['left', 'kicked'].includes(membershipStatus)) {
    throw httpError(403, 'User is not a member of this game chat');
  }

  return { validated, chatId, userId: validated.user.id, session };
}

export function stateFor(context) {
  return createMiniAppState(context.session, {
    chatId: context.chatId,
    chatType: context.validated.chatType,
    user: context.validated.user,
    isAdmin: isAdminUser(context.userId),
  });
}

export function isAdminUser(userId) {
  return isOwner(userId);
}

export function requireAdmin(context) {
  if (!isAdminUser(context.userId)) throw httpError(403, 'Только для администратора');
}

/** Game actions answer 200 on success, 409 on a rejected action, plus fresh state. */
export function sendResult(res, result, context) {
  return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
}

/** Gold is frozen while the player sits at a 21 / elements table. */
export function assertGoldUnlocked(context) {
  const message = goldLockForMember(context.session);
  if (!message) return;
  const error = new Error(message);
  error.status = 409;
  error.reason = GOLD_LOCK_REASON;
  throw error;
}

export function refreshContextSession(context, chat) {
  const member = chat?.members?.find(item => String(item.userId) === String(context.userId));
  if (member) context.session = member;
}
