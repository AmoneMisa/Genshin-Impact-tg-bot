// Social layer for the Mini App: friends (per game chat), clanmates, public
// player cards (another player's gear and stats) and last-seen presence.
//
// Friends live on the member record: member.game.friends = [userId, ...].
// Presence comes from member.game.lastSeenAt, stamped when the Mini App opens.

import { getEquipmentState } from './equipment.js';
import calcGearScore from '../functions/game/player/calcGearScore.js';

export const ONLINE_WINDOW_MS = 5 * 60 * 1000;
export const LAST_SEEN_STAMP_MS = 60 * 1000;
const MAX_FRIENDS = 50;

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function members(chat) {
  return Array.isArray(chat?.members) ? chat.members : [];
}

export function findMember(chat, userId) {
  return members(chat).find(member => String(member.userId) === String(userId)) || null;
}

function telegramUser(member) {
  return member?.userChatData?.user || {};
}

function isListed(member) {
  const user = telegramUser(member);
  return Boolean(member) && !member.isHided && !user.is_bot;
}

export function memberName(member) {
  const user = telegramUser(member);
  return user.first_name || user.username || `Игрок ${member?.userId ?? ''}`.trim();
}

/** "В игре" within the online window, otherwise how long ago, or "Не в сети". */
export function presence(lastSeenAt, now = Date.now()) {
  const seen = number(lastSeenAt);
  if (!seen) return { online: false, text: 'Не в сети' };
  const ago = Math.max(0, now - seen);
  if (ago <= ONLINE_WINDOW_MS) return { online: true, text: 'В игре' };
  const minutes = Math.floor(ago / 60000);
  if (minutes < 60) return { online: false, text: `Был(а) ${minutes} мин назад` };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { online: false, text: `Был(а) ${hours}ч назад` };
  const days = Math.floor(hours / 24);
  return { online: false, text: `Был(а) ${days} дн назад` };
}

/** Records Mini App activity; returns true when the member changed and needs saving. */
export function stampLastSeen(member, now = Date.now()) {
  if (!member) return false;
  if (!member.game || typeof member.game !== 'object') member.game = {};
  if (now - number(member.game.lastSeenAt) < LAST_SEEN_STAMP_MS) return false;
  member.game.lastSeenAt = now;
  return true;
}

function friendIds(member) {
  return Array.isArray(member?.game?.friends) ? member.game.friends.map(String) : [];
}

/** Compact row for friend / clanmate / candidate lists. */
export function memberRow(member, now = Date.now()) {
  const game = member?.game || {};
  const user = telegramUser(member);
  return {
    userId: String(member.userId),
    name: memberName(member),
    username: user.username || null,
    level: Math.max(1, number(game.stats?.lvl, 1)),
    className: game.gameClass?.stats?.name || 'noClass',
    classTitle: game.gameClass?.stats?.translateName || null,
    gender: member.gender === 'female' ? 'female' : 'male',
    ...presence(game.lastSeenAt, now),
  };
}

function byPresence(a, b) {
  return Number(b.online) - Number(a.online) || b.level - a.level || a.name.localeCompare(b.name, 'ru');
}

export function getSocialState(chat, userId, { clanMemberIds = [], clanName = null, now = Date.now() } = {}) {
  const me = findMember(chat, userId);
  const friends = new Set(friendIds(me));
  const clan = new Set(clanMemberIds.map(String));
  const others = members(chat).filter(member => String(member.userId) !== String(userId) && isListed(member));
  return {
    friends: others.filter(member => friends.has(String(member.userId))).map(member => memberRow(member, now)).sort(byPresence),
    clanmates: others.filter(member => clan.has(String(member.userId))).map(member => ({ ...memberRow(member, now), isFriend: friends.has(String(member.userId)) })).sort(byPresence),
    candidates: others.filter(member => !friends.has(String(member.userId))).map(member => memberRow(member, now)).sort(byPresence),
    clanName,
    maxFriends: MAX_FRIENDS,
  };
}

/** Adds or removes a friend inside this chat. Mutates the chat; caller saves. */
export function setFriend(chat, userId, targetId, action) {
  const me = findMember(chat, userId);
  if (!me) return { ok: false, reason: 'not_member' };
  if (String(targetId) === String(userId)) return { ok: false, reason: 'self' };
  const target = findMember(chat, targetId);
  if (!isListed(target)) return { ok: false, reason: 'unknown_player' };
  if (!me.game || typeof me.game !== 'object') me.game = {};
  const current = friendIds(me);
  if (action === 'add') {
    if (current.includes(String(targetId))) return { ok: false, reason: 'already_friend' };
    if (current.length >= MAX_FRIENDS) return { ok: false, reason: 'too_many' };
    me.game.friends = [...current, String(targetId)];
  } else if (action === 'remove') {
    if (!current.includes(String(targetId))) return { ok: false, reason: 'not_friend' };
    me.game.friends = current.filter(id => id !== String(targetId));
  } else {
    return { ok: false, reason: 'invalid_action' };
  }
  return { ok: true };
}

function safeGearScore(game) {
  try { return number(calcGearScore(game)); } catch { return 0; }
}

/** Public card of another player: identity, stats and equipped gear only. */
export function getPlayerCard(chat, targetId, viewerId, { clanName = null, now = Date.now() } = {}) {
  const member = findMember(chat, targetId);
  if (!isListed(member)) return null;
  const game = member.game || {};
  const classStats = game.gameClass?.stats || {};
  let equippedSlots = {};
  let equipped = [];
  try {
    const equipment = getEquipmentState(member);
    equippedSlots = equipment.equippedSlots;
    equipped = equipment.items.filter(item => item.isUsed);
  } catch {
    // Players without equipment data simply show empty slots.
  }
  return {
    ...memberRow(member, now),
    clanName,
    isSelf: String(targetId) === String(viewerId),
    isFriend: friendIds(findMember(chat, viewerId)).includes(String(targetId)),
    stats: {
      hp: number(classStats.maxHp ?? classStats.hp),
      mp: number(classStats.maxMp ?? classStats.mp),
      cp: number(classStats.maxCp ?? classStats.cp),
      attack: number(classStats.damage ?? classStats.attack),
      defense: number(classStats.defense ?? classStats.defence),
      gearScore: safeGearScore(game),
      sword: number(member.sword),
    },
    equippedSlots,
    items: equipped,
  };
}
