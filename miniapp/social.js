// Social layer for the Mini App: friends (per game chat), clanmates, public
// player cards (another player's gear and stats) and last-seen presence.
//
// Friends are mutual and live on the member record: member.game.friends,
// plus pending friendRequestsIn / friendRequestsOut (userId lists).
// Presence comes from member.game.lastSeenAt, stamped when the Mini App opens.




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
  const incomingIds = new Set(idList(me, 'friendRequestsIn'));
  const outgoingIds = new Set(idList(me, 'friendRequestsOut'));
  const clan = new Set(clanMemberIds.map(String));
  const others = members(chat).filter(member => String(member.userId) !== String(userId) && isListed(member));
  return {
    friends: others.filter(member => friends.has(String(member.userId))).map(member => memberRow(member, now)).sort(byPresence),
    clanmates: others.filter(member => clan.has(String(member.userId))).map(member => ({ ...memberRow(member, now), isFriend: friends.has(String(member.userId)), requestState: incomingIds.has(String(member.userId)) ? 'incoming' : outgoingIds.has(String(member.userId)) ? 'outgoing' : null })).sort(byPresence),
    incoming: others.filter(member => incomingIds.has(String(member.userId)) && !friends.has(String(member.userId))).map(member => memberRow(member, now)).sort(byPresence),
    outgoing: others.filter(member => outgoingIds.has(String(member.userId)) && !friends.has(String(member.userId))).map(member => memberRow(member, now)).sort(byPresence),
    candidates: others.filter(member => !friends.has(String(member.userId)) && !incomingIds.has(String(member.userId)) && !outgoingIds.has(String(member.userId))).map(member => memberRow(member, now)).sort(byPresence),
    clanName,
    maxFriends: MAX_FRIENDS,
  };
}

function idList(member, key) {
  return Array.isArray(member?.game?.[key]) ? member.game[key].map(String) : [];
}

function ensureGame(member) {
  if (!member.game || typeof member.game !== 'object') member.game = {};
  return member.game;
}

function without(list, id) {
  return list.filter(item => item !== String(id));
}

function makeFriends(me, target) {
  const mine = ensureGame(me);
  const theirs = ensureGame(target);
  mine.friends = [...without(idList(me, 'friends'), target.userId), String(target.userId)];
  theirs.friends = [...without(idList(target, 'friends'), me.userId), String(me.userId)];
  mine.friendRequestsIn = without(idList(me, 'friendRequestsIn'), target.userId);
  mine.friendRequestsOut = without(idList(me, 'friendRequestsOut'), target.userId);
  theirs.friendRequestsIn = without(idList(target, 'friendRequestsIn'), me.userId);
  theirs.friendRequestsOut = without(idList(target, 'friendRequestsOut'), me.userId);
}

/**
 * Friendship is mutual and goes through requests, all inside this chat:
 * add (send a request, or accept if they already asked), accept, decline
 * (incoming), cancel (outgoing) and remove (drops both sides).
 * Mutates the chat; caller saves.
 */
export function setFriend(chat, userId, targetId, action) {
  const me = findMember(chat, userId);
  if (!me) return { ok: false, reason: 'not_member' };
  if (String(targetId) === String(userId)) return { ok: false, reason: 'self' };
  const target = findMember(chat, targetId);
  if (!isListed(target)) return { ok: false, reason: 'unknown_player' };
  const mine = ensureGame(me);
  const theirs = ensureGame(target);
  const friends = idList(me, 'friends');
  const incoming = idList(me, 'friendRequestsIn').includes(String(targetId));
  const outgoing = idList(me, 'friendRequestsOut').includes(String(targetId));

  if (action === 'add' || action === 'accept') {
    if (friends.includes(String(targetId))) return { ok: false, reason: 'already_friend' };
    if (action === 'accept' && !incoming) return { ok: false, reason: 'no_request' };
    if (incoming) {
      if (friends.length >= MAX_FRIENDS) return { ok: false, reason: 'too_many' };
      if (idList(target, 'friends').length >= MAX_FRIENDS) return { ok: false, reason: 'target_too_many' };
      makeFriends(me, target);
      return { ok: true, status: 'friends' };
    }
    if (outgoing) return { ok: false, reason: 'already_requested' };
    if (friends.length + idList(me, 'friendRequestsOut').length >= MAX_FRIENDS) return { ok: false, reason: 'too_many' };
    mine.friendRequestsOut = [...idList(me, 'friendRequestsOut'), String(targetId)];
    theirs.friendRequestsIn = [...without(idList(target, 'friendRequestsIn'), userId), String(userId)];
    return { ok: true, status: 'requested' };
  }
  if (action === 'decline') {
    if (!incoming) return { ok: false, reason: 'no_request' };
    mine.friendRequestsIn = without(idList(me, 'friendRequestsIn'), targetId);
    theirs.friendRequestsOut = without(idList(target, 'friendRequestsOut'), userId);
    return { ok: true, status: 'declined' };
  }
  if (action === 'cancel') {
    if (!outgoing) return { ok: false, reason: 'no_request' };
    mine.friendRequestsOut = without(idList(me, 'friendRequestsOut'), targetId);
    theirs.friendRequestsIn = without(idList(target, 'friendRequestsIn'), userId);
    return { ok: true, status: 'cancelled' };
  }
  if (action === 'remove') {
    if (!friends.includes(String(targetId))) return { ok: false, reason: 'not_friend' };
    mine.friends = without(friends, targetId);
    theirs.friends = without(idList(target, 'friends'), userId);
    return { ok: true, status: 'removed' };
  }
  return { ok: false, reason: 'invalid_action' };
}

/** Identity and available interactions only; never disclose another player's build. */
export function getPlayerCard(chat,targetId,viewerId,{clanName=null,targetInClan=Boolean(clanName),viewerClan=null,now=Date.now()}={}){
 const member=findMember(chat,targetId),viewer=findMember(chat,viewerId);
 if(!isListed(member))return null;
 const self=String(targetId)===String(viewerId),role=viewerClan?.members?.find(m=>String(m.userId)===String(viewerId))?.role;
 const party=viewer?.game?.party,targetParty=member.game?.party;
 return {...memberRow(member,now),clanName,isSelf:self,isFriend:friendIds(viewer).includes(String(targetId)),requestState:idList(viewer,'friendRequestsIn').includes(String(targetId))?'incoming':idList(viewer,'friendRequestsOut').includes(String(targetId))?'outgoing':null,
  canInviteClan:!self&&['owner','officer'].includes(role)&&!targetInClan&&!viewerClan.members.some(m=>String(m.userId)===String(targetId))&&viewerClan.members.length<30,
  canInviteParty:!self&&!targetParty?.id&&(!party?.id||String(party.leaderId)===String(viewerId)&&chat.members.filter(m=>m.game?.party?.id===party.id).length<9),
  canDuel:!self&&Boolean(viewerClan?.members?.some(m=>String(m.userId)===String(targetId)))&&Boolean(viewer?.game?.gameClass&&member.game?.gameClass)};
}
