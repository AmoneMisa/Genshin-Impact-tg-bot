// Mini App notifications: Telegram pushes for social events and the counters
// behind the red dots (friends, clan) on the main screen.
//
// Pushes are best-effort DMs: Telegram refuses them when the player never
// started the bot, so a failure is swallowed and the red dot is the fallback.

import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import { translateFor } from './language.js';
import { getSocialState } from './social.js';
import { getChestState } from './chest.js';
import { getClanProgressionState } from './clanProgression.js';
import { getClanQuizState } from './clan.js';

const DEDUPE_MS = 30_000;
const recent = new Map();

function isDuplicate(userId, text, now) {
  for (const [key, at] of recent) if (now - at > DEDUPE_MS) recent.delete(key);
  const key = `${userId}:${text}`;
  if (recent.has(key)) return true;
  recent.set(key, now);
  return false;
}

/** Fire-and-forget DM to a player. Never throws. */
export function pushTo(userId, text, { send = sendMessage, now = Date.now(), translate = translateFor } = {}) {
  if (!userId || !text || isDuplicate(userId, text, now)) return Promise.resolve(false);
  return Promise.resolve()
    .then(() => translate(userId, text))
    .then(message => send(Number(userId), message))
    .then(() => true, () => false);
}

/** Sends every `{ userId, text }` item of a result's `notify` list. */
export function pushAll(items, options) {
  if (!Array.isArray(items)) return Promise.resolve([]);
  return Promise.all(items.map(item => pushTo(item.userId, item.text, options)));
}

const BOSS_PUSH_ACTIVE_MS = 3 * 24 * 3600_000;
const BOSS_PUSH_LIMIT = 50;

/** Chat members worth a "boss summoned" DM: recently seen humans, not the summoner. */
export function bossSpawnRecipients(chat, summonerId, now = Date.now()) {
  return (Array.isArray(chat?.members) ? chat.members : [])
    .filter(member => String(member.userId) !== String(summonerId))
    .filter(member => !member.isHided && !member.userChatData?.user?.is_bot)
    .filter(member => now - (Number(member.game?.lastSeenAt) || 0) <= BOSS_PUSH_ACTIVE_MS)
    .slice(0, BOSS_PUSH_LIMIT)
    .map(member => String(member.userId));
}

/** Ready-to-collect things on the player's own session: bonus, chest, arena, gacha. */
export function personalBadges(session) {
  if (!session) return { bonus: 0, chest: 0, arena: 0, gacha: 0 };
  let chest = 0;
  try { chest = getChestState(session).available ? 1 : 0; } catch { chest = 0; }
  const gacha = session.game?.gachaTempItem ? 1
    : Object.values(session.game?.gacha || {}).some(entry => Number(entry?.freeSpins) > 0) ? 1 : 0;
  return {
    bonus: Number(session.game?.bonusChances) > 0 ? 1 : 0,
    chest,
    arena: Number(session.game?.arenaChances) > 0 ? 1 : 0,
    gacha,
  };
}

/**
 * Counts behind the red dots, keyed by feature id. `bossAlive` is resolved by
 * the caller because it needs the database.
 */
export function getBadges(chat, userId, clan = null, { session = null, bossAlive = false, mail = 0 } = {}) {
  const social = getSocialState(chat, userId);
  const friends = (social.incoming || []).length;

  let clanCount = 0;
  if (clan) {
    const role = (clan.members || []).find(member => String(member.userId) === String(userId))?.role;
    if (role === 'owner' || role === 'officer') clanCount += (clan.applications || []).length;
    const tasks = getClanProgressionState(clan, userId)?.tasks;
    if (tasks) {
      clanCount += tasks.items.filter(item => item.done && !item.claimed).length;
      if (tasks.bonusAvailable) clanCount += 1;
    }
    const quiz = getClanQuizState(clan, userId);
    if (quiz?.available && !quiz.answered) clanCount += 1;
  }

  const personal = personalBadges(session);
  const boss = bossAlive ? 1 : 0;
  const total = friends + clanCount + boss + mail + Object.values(personal).reduce((sum, value) => sum + value, 0);
  return { friends, clan: clanCount, boss, mail, ...personal, total };
}
