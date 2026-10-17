import { randomUUID } from 'node:crypto';
import { buildDeck, inspectLoadout } from '../webapp/gwent-builder.js';
import { createMatch, playCard, passRound, resolveChoice, scores } from '../webapp/gwent-engine.js';
import { memberName, presence } from './social.js';

export const QUEUE_TTL = 35_000;
export const TURN_TTL = 5 * 60_000;
export const INVITE_TTL = 15 * 60_000;
export const INVITE_PUSH_COOLDOWN = 60_000;
const HEARTBEAT_EVERY = 10_000;
export const TURN_PUSH_COOLDOWN = 2 * 60_000;
const RECENT_TTL = 30 * 60_000;
const DONE_TTL = 24 * 60 * 60_000;
const opposite = side => side === 'player' ? 'ai' : 'player';
const fail = reason => ({ ok: false, reason, error: reason });
const clone = value => structuredClone(value);

function store(chat) {
  chat.game ||= {};
  const data = chat.game.gwent ||= { queue: [], matches: [], loadouts: {} };
  data.invites ||= [];
  return data;
}
function current(data, userId) {
  return data.matches.find(match => match.players.includes(String(userId)) && !match.dismissed.includes(String(userId)));
}
function finish(match, loser, now, reason) {
  match.state.phase = 'matchOver'; match.state.winner = opposite(loser);
  match.state.pending = null; match.endedAt = now; match.endKind = reason; match.loser = loser; match.revision++;
}
function sweep(data, now) {
  data.queue = data.queue.filter(entry => entry.seenAt > now - QUEUE_TTL);
  for (const match of data.matches) {
    if (match.state.phase === 'playing' && now >= match.deadline) finish(match, match.state.pending?.side || match.state.turn, now, 'timeout');
  }
  data.matches = data.matches.filter(match => !match.endedAt || now - match.endedAt < DONE_TTL);
  for (const invite of data.invites) if (invite.status === 'pending' && invite.expiresAt <= now) invite.status = 'expired';
  data.invites = data.invites.filter(invite => now - invite.createdAt < DONE_TTL);
}
function member(chat, id) { return chat.members?.find(member => String(member.userId) === String(id)); }
function friends(chat, one, two) {
  const a = member(chat, one), b = member(chat, two);
  return !!a && !!b && !a.isHided && !b.isHided && !b.userChatData?.user?.is_bot
    && (a.game?.friends || []).map(String).includes(String(two)) && (b.game?.friends || []).map(String).includes(String(one));
}
function startMatch(data, first, second, now, rng) {
  const match = { id: randomUUID(), players: [first.userId, second.userId], names: [first.name, second.name],
    factions: [first.loadout.faction, second.loadout.faction], loadouts: [clone(first.loadout), clone(second.loadout)], dismissed: [], rematch: [], revision: 0, pushedAt: {}, deadline: now + TURN_TTL,
    state: createMatch({ playerDeck: buildDeck(first.loadout), aiDeck: buildDeck(second.loadout), rng }) };
  data.matches.push(match);
  data.queue = data.queue.filter(entry => !match.players.includes(entry.userId));
  for (const invite of data.invites) if (invite.status === 'pending' && match.players.includes(invite.from)) invite.status = 'cancelled';
  return match;
}
function inviteView(chat, invite) {
  return { id: invite.id, from: invite.from, to: invite.to, fromName: memberName(member(chat, invite.from)),
    toName: invite.to ? memberName(member(chat, invite.to)) : null, faction: invite.loadout.faction,
    status: invite.status, expiresAt: invite.expiresAt, matchId: invite.matchId || null,
    canPushAt: (invite.lastPushedAt || 0) + INVITE_PUSH_COOLDOWN };
}

const END_TEXT = {
  surrender: { self: 'Вы сдались', other: 'Соперник сдался', watcher: 'Матч завершён сдачей' },
  timeout: { self: 'Вы не успели сделать ход', other: 'Соперник не успел сделать ход', watcher: 'Истекло время хода' },
};
/** Why the match ended, from the point of view of `own` (a side) or of a spectator (null). */
function endText(match, own) {
  const text = END_TEXT[match.endKind];
  return text ? text[own === null ? 'watcher' : match.loser === own ? 'self' : 'other'] : '';
}

/** Redact first, then orient the public snapshot so the authenticated user is always `player`. */
export function gwentMatchView(match, userId) {
  const index = match.players.indexOf(String(userId));
  if (index < 0) return null;
  const own = index === 0 ? 'player' : 'ai', enemy = opposite(own), raw = match.state;
  const state = clone(raw);
  delete state.rngState; delete state.nextUid;
  for (const side of ['player', 'ai']) {
    state.sides[side].deckCount = state.sides[side].deck.length;
    state.sides[side].handCount = state.sides[side].hand.length;
    state.sides[side].deck = [];
  }
  state.sides[enemy].hand = [];
  state.reveals[enemy] = [];
  if (state.pending?.side !== own && state.pending) state.pending = { side: enemy, kind: 'waiting', options: [] };
  // Do not leak hidden selections or discarded hand cards via last-result metadata.
  const remap = value => value === own ? 'player' : value === enemy ? 'ai' : value;
  for (const field of ['sides', 'passed', 'wins', 'tieWins', 'reveals']) state[field] = { player: state[field][own], ai: state[field][enemy] };
  state.turn = remap(state.turn); state.starter = remap(state.starter); state.winner = remap(state.winner);
  if (state.pending) state.pending.side = remap(state.pending.side);
  state.rounds = (state.rounds || []).map(round => ({ round: round.round, winner: remap(round.winner), scores: { player: round.scores[own], ai: round.scores[enemy] } }));
  if (state.lastRound) state.lastRound = { ...state.lastRound, winner: remap(state.lastRound.winner), scores: { player: raw.lastRound.scores[own], ai: raw.lastRound.scores[enemy] } };
  const other = match.players[1 - index];
  const rematch = state.phase === 'matchOver'
    ? { requested: (match.rematch || []).includes(String(userId)), offered: (match.rematch || []).includes(other), closed: match.dismissed.includes(other), declined: (match.declined || []).includes(other) } : null;
  return { id: match.id, revision: match.revision, deadline: match.deadline, endReason: endText(match, own), rematch,
    opponent: match.names[1 - index], faction: match.factions[index], enemyFaction: match.factions[1 - index], state };
}

export function gwentSpectatorView(match) {
  const view = gwentMatchView(match, match.players[0]);
  view.spectator = true; view.playerName = match.names[0]; view.rematch = null; view.endReason = endText(match, null);
  view.state.sides.player.hand = [];
  view.state.reveals = { player: [], ai: [] };
  if (view.state.pending) view.state.pending = { side: view.state.pending.side, kind: 'waiting', options: [] };
  return view;
}

/** Open matches and the ones finished in the last half hour; games of friends come first. */
function gameList(chat, data, id, now) {
  const rows = data.matches
    .filter(m => m.state.phase === 'playing' || (m.endedAt && now - m.endedAt < RECENT_TTL))
    .map(m => ({ id: m.id, names: m.names, factions: m.factions, round: m.state.round, scores: scores(m.state), wins: m.state.wins,
      participant: m.players.includes(id) && !m.dismissed.includes(id), finished: m.state.phase !== 'playing',
      winnerName: m.state.winner === 'player' ? m.names[0] : m.state.winner === 'ai' ? m.names[1] : null,
      friend: m.players.some(player => player !== id && friends(chat, id, player)), endedAt: m.endedAt || 0, startedOrder: 0 }));
  const open = rows.filter(row => !row.finished).slice(-30);
  const recent = rows.filter(row => row.finished).sort((a, b) => b.endedAt - a.endedAt).slice(0, 10);
  return [...open, ...recent].sort((a, b) => Number(a.finished) - Number(b.finished) || Number(b.friend) - Number(a.friend));
}

export function gwentState(chat, userId, now = Date.now(), { watch = null, invite = null } = {}) {
  if (!member(chat,userId)) return fail('Игрок не найден в игровом чате');
  const data = store(chat); sweep(data, now);
  const entry = data.queue.find(entry => entry.userId === String(userId));
  // The queue heartbeat is stored at most every 10 s (it expires after 35 s), so polling does not rewrite the chat.
  if (entry && now - entry.seenAt >= HEARTBEAT_EVERY) entry.seenAt = now;
  const match = current(data, userId);
  const id = String(userId), me = member(chat, id);
  const friendRows = (me?.game?.friends || []).filter(friend => friends(chat, id, friend)).map(friend => {
    const person = member(chat, friend);
    const playing = current(data, friend);
    return { userId: String(friend), name: memberName(person), ...presence(person.game?.lastSeenAt, now), busy: !!playing,
      watchId: playing && playing.state.phase === 'playing' ? playing.id : null };
  }).sort((a,b) => Number(b.online)-Number(a.online) || a.name.localeCompare(b.name,'ru'));
  const result = { loadouts: clone(data.loadouts[id] || {}), searching: !!entry, match: match ? gwentMatchView(match, id) : null, serverNow: now,
    friends: friendRows, incoming: data.invites.filter(i => i.status === 'pending' && i.to === id).map(i => inviteView(chat,i)),
    outgoing: data.invites.filter(i => i.status === 'pending' && i.from === id).map(i => inviteView(chat,i)),
    games: gameList(chat, data, id, now) };
  if (watch) {
    const watched = data.matches.find(m => m.id === watch);
    if (!watched) return fail('Игра недоступна для просмотра');
    result.spectating = gwentSpectatorView(watched);
  }
  if (invite) {
    const found = data.invites.find(i => i.id === invite && (i.to === null || i.to === id || i.from === id));
    if (!found) return fail('Приглашение недоступно');
    result.invitation = inviteView(chat, found);
  }
  return result;
}

export function gwentAction(chat, userId, body, now = Date.now(), rng = Math.random) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Неизвестное действие');
  if (!member(chat,userId)) return fail('Игрок не найден в игровом чате');
  const data = store(chat); sweep(data, now);
  const id = String(userId), match = current(data, id);
  let notice = null;
  if (body.action === 'save') {
    const stats = inspectLoadout(body.loadout);
    if (!stats.valid) return fail(stats.errors.join('. '));
    data.loadouts[id] ||= {}; data.loadouts[id][body.loadout.faction] = clone(body.loadout);
  } else if (body.action === 'join') {
    if (match) return fail('Сначала завершите текущий матч');
    const stats = inspectLoadout(body.loadout);
    if (!stats.valid) return fail(stats.errors.join('. '));
    if (data.queue.some(entry => entry.userId === id)) return { ok: true, ...gwentState(chat, id, now) };
    const name = memberName(member(chat, id)).slice(0, 60);
    const opponent = data.queue.shift();
    if (!opponent) data.queue.push({ userId: id, name, loadout: clone(body.loadout), seenAt: now });
    else {
      startMatch(data, opponent, {userId:id,name,loadout:body.loadout}, now, rng);
    }
  } else if (body.action === 'invite') {
    if (match || data.queue.some(e => e.userId === id)) return fail('Сначала завершите матч или отмените поиск');
    const stats = inspectLoadout(body.loadout);
    if (!stats.valid) return fail(stats.errors.join('. '));
    const target = body.targetId == null ? null : String(body.targetId);
    if (target !== null && (target === id || !friends(chat,id,target))) return fail('Выберите друга из игрового чата');
    if (target && current(data,target)) return fail('Друг уже играет');
    let created = data.invites.find(i => i.from === id && i.to === target && i.status === 'pending');
    if (!created) {
      if (data.invites.filter(i => i.from === id && i.status === 'pending').length >= 5) return fail('Можно создать не больше пяти приглашений одновременно');
      created = { id:randomUUID(), from:id, to:target, createdAt:now, expiresAt:now+INVITE_TTL, status:'pending', loadout:clone(body.loadout) };
      data.invites.push(created);
    }
    return {ok:true,...gwentState(chat,id,now), invitation:inviteView(chat,created)};
  } else if (['accept_invite','decline_invite','cancel_invite','push_invite'].includes(body.action)) {
    const invitation = data.invites.find(i => i.id === body.inviteId);
    if (!invitation || invitation.status !== 'pending') return fail('Приглашение уже закрыто или истекло');
    const mine = invitation.from === id, recipient = invitation.to === id || invitation.to === null && !mine;
    if (body.action === 'cancel_invite') {
      if (!mine) return fail('Это приглашение другого игрока');
      invitation.status = 'cancelled';
    } else if (body.action === 'decline_invite') {
      if (!recipient || invitation.to === null) return fail('Это приглашение другому игроку');
      invitation.status = 'declined';
    } else if (body.action === 'push_invite') {
      if (!mine || !invitation.to || !friends(chat,id,invitation.to)) return fail('Уведомление можно отправить только приглашённому другу');
      if (invitation.lastPushedAt && now-invitation.lastPushedAt < INVITE_PUSH_COOLDOWN) return fail('Уведомление уже отправлено. Подождите минуту');
      invitation.lastPushedAt = now;
      return {ok:true,...gwentState(chat,id,now), notifyInvite:{id:invitation.id,userId:invitation.to,fromName:memberName(member(chat,id))}};
    } else {
      if (!recipient) return fail('Это приглашение другому игроку');
      if (invitation.to && !friends(chat,invitation.from,id)) return fail('Приглашение доступно только друзьям');
      if (match || current(data,invitation.from) || data.queue.some(e => [id,invitation.from].includes(e.userId))) return fail('Один из игроков уже занят');
      const stats = inspectLoadout(body.loadout); if (!stats.valid) return fail(stats.errors.join('. '));
      invitation.status = 'accepted'; invitation.to = id;
      const created = startMatch(data,{userId:invitation.from,name:memberName(member(chat,invitation.from)),loadout:invitation.loadout},
        {userId:id,name:memberName(member(chat,id)),loadout:body.loadout},now,rng);
      invitation.matchId = created.id;
      notice = pushNotice(chat, created, id, invitation.from, 'start', now);
    }
  } else if (body.action === 'cancel') {
    // A cancel racing a pairing must return the paired match rather than abandon it silently.
    data.queue = data.queue.filter(entry => entry.userId !== id);
  } else if (body.action === 'rematch') {
    if (!match || match.id !== body.matchId || match.state.phase !== 'matchOver') return fail('Реванш доступен после окончания матча');
    const other = match.players.find(player => player !== id);
    if (match.dismissed.includes(other)) return fail('Соперник уже вышел из матча');
    if ((match.declined || []).includes(other)) return fail('Соперник отказался от реванша');
    if (current(data, other)?.id !== match.id || data.queue.some(entry => [id, other].includes(entry.userId))) return fail('Один из игроков уже занят');
    match.rematch ||= [];
    if (!match.rematch.includes(id)) { match.rematch.push(id); match.revision++; }
    if (match.rematch.length === 2) {
      match.dismissed = [...match.players];
      const [first, second] = match.players;
      const created = startMatch(data, { userId: first, name: match.names[0], loadout: match.loadouts[0] },
        { userId: second, name: match.names[1], loadout: match.loadouts[1] }, now, rng);
      notice = pushNotice(chat, created, id, other, 'start', now);
    } else notice = pushNotice(chat, match, id, other, 'rematch', now);
  } else if (body.action === 'rematch_decline') {
    if (!match || match.id !== body.matchId || match.state.phase !== 'matchOver') return fail('Реванш доступен после окончания матча');
    match.declined ||= [];
    if (!match.declined.includes(id)) { match.declined.push(id); match.rematch = (match.rematch || []).filter(item => item !== id); match.revision++; }
  } else if (body.action === 'dismiss') {
    if (!match || match.id !== body.matchId || match.state.phase !== 'matchOver') return fail('Матч ещё не завершён');
    match.dismissed.push(id);
  } else if (['play', 'pass', 'choice', 'surrender'].includes(body.action)) {
    if (!match || match.id !== body.matchId) return fail('Матч не найден');
    if (match.state.phase !== 'playing') return fail('Матч завершён');
    if (body.revision !== match.revision) return fail('Состояние изменилось. Повторите ход');
    const side = match.players[0] === id ? 'player' : 'ai';
    if (body.action === 'surrender') finish(match, side, now, 'surrender');
    else {
      const result = body.action === 'choice' ? resolveChoice(match.state, side, body.choiceId)
        : body.action === 'pass' ? passRound(match.state, side)
          : playCard(match.state, side, body.uid, { row: body.row, targetUid: body.targetUid });
      if (result.error) return fail(result.error);
      match.state = result.state; match.revision++; match.deadline = now + TURN_TTL;
      if (match.state.phase === 'matchOver') match.endedAt = now;
      else {
        const mover = match.state.pending ? match.state.pending.side : match.state.turn;
        const moverId = match.players[mover === 'player' ? 0 : 1];
        if (moverId !== id) notice = pushNotice(chat, match, id, moverId, 'turn', now);
      }
    }
  } else return fail('Неизвестное действие');
  return { ok: true, ...gwentState(chat, id, now), ...(notice ? { notifyPlay: notice } : {}) };
}

/**
 * A Telegram message for a player who is not in the app: their turn, a started match or a rematch offer.
 * Players who are online are never messaged, and turn messages are limited to one per two minutes.
 */
function pushNotice(chat, match, fromId, toId, kind, now) {
  const person = member(chat, toId);
  if (!person || person.isHided || presence(person.game?.lastSeenAt, now).online) return null;
  if (kind === 'turn') {
    match.pushedAt ||= {};
    if (now - (match.pushedAt[toId] || 0) < TURN_PUSH_COOLDOWN) return null;
    match.pushedAt[toId] = now;
  }
  return { kind, userId: toId, fromName: memberName(member(chat, fromId)), matchId: match.id };
}

/**
 * A cheap summary of everything a read can change (queue heartbeats, timeouts, expiries, closures).
 * The route saves the chat after a read only when this differs from before the read.
 */
export function gwentFingerprint(chat) {
  const data = chat?.game?.gwent;
  if (!data || !(data.queue?.length || data.matches?.length || data.invites?.length || Object.keys(data.loadouts || {}).length)) return '';
  return JSON.stringify([
    (data.queue || []).map(entry => [entry.userId, entry.seenAt]),
    (data.matches || []).map(match => [match.id, match.revision, match.endedAt || 0, match.dismissed.length, (match.rematch || []).length, (match.declined || []).length, Object.values(match.pushedAt || {}).join()]),
    (data.invites || []).map(invite => [invite.id, invite.status, invite.lastPushedAt || 0]),
    Object.keys(data.loadouts || {}).length,
  ]);
}
