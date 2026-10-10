// Mini App face of the party system (functions/game/party/party.js): the screen state and its actions.
import {
  LOOT_MODES, PARTY_MAX, PARTY_COST_STEP, acceptInvite, lootModeOf, setLootMode, createParty, declineInvite, disbandParty, findMember, invitePlayer, kickMember, leaveParty,
  partyState, pruneInvites,
} from '../functions/game/party/party.js';
import getCurrentHp from '../functions/game/player/getters/getCurrentHp.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import getCurrentMp from '../functions/game/player/getters/getCurrentMp.js';
import getMaxMp from '../functions/game/player/getters/getMaxMp.js';
import getCurrentCp from '../functions/game/player/getters/getCurrentCp.js';
import getMaxCp from '../functions/game/player/getters/getMaxCp.js';
import { memberName } from './social.js';

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const chatOf = session => (typeof session?.ownerDocument === 'function' ? session.ownerDocument() : null);
const listed = member => Boolean(member?.game) && !member.isHided && !member.userChatData?.user?.is_bot;

function memberDto(member, session, leaderId) {
  const gameClass = member.game.gameClass;
  const hp = number(getCurrentHp(member, gameClass)), maxHp = Math.max(1, number(getMaxHp(member, gameClass), 1));
  const mp = number(getCurrentMp(member, gameClass)), maxMp = Math.max(1, number(getMaxMp(member, gameClass), 1));
  return {
    userId: String(member.userId),
    name: memberName(member),
    level: number(member.game.stats?.lvl, 1),
    className: gameClass?.stats?.name || 'noClass',
    classTitle: gameClass?.stats?.translateName || gameClass?.stats?.name || 'Без класса',
    gender: member.gender === 'female' ? 'female' : 'male',
    cp:number(getCurrentCp(member,gameClass)),maxCp:Math.max(1,number(getMaxCp(member,gameClass),1)),hp, maxHp, mp, maxMp,
    leader: String(member.userId) === String(leaderId),
    me: String(member.userId) === String(session.userId),
  };
}

export function getPartyState(session, now = Date.now()) {
  const chat = chatOf(session);
  const base = {max: PARTY_MAX, costStep: PARTY_COST_STEP, lootModes: LOOT_MODES, party: null, invites: [], candidates: []};
  if (!chat) return base;
  const pruned = pruneInvites(chat, session, now);
  const party = partyState(chat, session);
  const state = {
    ...base,
    changed: pruned,
    party: party ? {id: party.id, leaderId: party.leaderId, loot: lootModeOf(session), amLeader: party.leaderId === String(session.userId), members: party.members.map(member => memberDto(member, session, party.leaderId))} : null,
    invites: (session.game.partyInvites || []).map(invite => {
      const from = findMember(chat, invite.fromId);
      const size = chat.members.filter(member => member.game?.party?.id === invite.partyId).length;
      return {partyId: invite.partyId, fromId: String(invite.fromId), fromName: from ? memberName(from) : 'Игрок', size, remainMs: Math.max(0, invite.until - now)};
    }),
  };
  if (!party || party.leaderId === String(session.userId)) {
    const pending = new Set(chat.members.flatMap(member => (member.game?.partyInvites || []).filter(invite => invite.partyId === party?.id && invite.until > now).map(() => String(member.userId))));
    state.candidates = chat.members
      .filter(member => listed(member) && String(member.userId) !== String(session.userId) && !member.game.party?.id)
      .map(member => ({userId: String(member.userId), name: memberName(member), level: number(member.game.stats?.lvl, 1), className: member.game.gameClass?.stats?.name || 'noClass', invited: pending.has(String(member.userId))}));
  }
  return state;
}

/** Runs one party action; the members it changed are flagged so that saveSession writes them. */
export function performPartyAction(session, action, body = {}, now = Date.now()) {
  const chat = chatOf(session);
  if (!chat) return {ok: false, reason: 'no_chat'};
  let result;
  switch (action) {
    case 'create': result = createParty(chat, session, now); break;
    case 'invite': result = invitePlayer(chat, session, body.userId, now); break;
    case 'accept': result = acceptInvite(chat, session, String(body.partyId || ''), now); break;
    case 'decline': result = declineInvite(chat, session, String(body.partyId || '')); break;
    case 'leave': result = leaveParty(chat, session); break;
    case 'kick': result = kickMember(chat, session, body.userId); break;
    case 'disband': result = disbandParty(chat, session); break;
    case 'loot': result = setLootMode(chat, session, String(body.mode || '')); break;
    default: return {ok: false, reason: 'unknown_action'};
  }
  for (const member of result.changed || []) if (member !== session) member.needsSave = true;
  return {ok: result.ok, reason: result.reason, action};
}
