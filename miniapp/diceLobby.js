import crypto, { randomUUID } from 'node:crypto';
import { DICE, REROLLS, ROUNDS_TO_WIN, rollDice, evaluate, compareHands } from '../webapp/dice-poker.js';
import { cannotPay, closeInvite, parseStake, settleStakes, stakeView } from './gwentStakes.js';
import { presence } from './social.js';

// Dice poker between two players, with an optional stake (see gwentStakes.js: players only, never a house).
// Like Gwent it lives in one shared record, so friends meet across game chats. The server throws the dice.
// While a round is being thrown nobody sees the other's dice; they are shown when both have stood.
//
// A match keeps `state` in the shape the stake code reads (`phase`, `winner`: 'player' for the first seat,
// 'ai' for the second, 'draw') and the dice game itself in `game`.

export const INVITE_TTL = 15 * 60_000;
export const THROW_TTL = 90_000;
export const RESULT_TTL = 45_000;
const DONE_TTL = 24 * 60 * 60_000;
const IDLE_ROUNDS = 2;
const fail = reason => ({ ok: false, reason, error: reason });
const secure = () => (crypto.randomInt(0, 6) + 0.5) / 6;

export const emptyDice = () => ({ invites: [], matches: [], credits: [] });

const current = (data, id) => data.matches.find(match => match.players.includes(id) && !match.dismissed.includes(id));
const roomFor = (data, id) => data.invites.find(invite => invite.status === 'pending' && invite.from === id);

function freshGame(rng, round = 1, wins = [0, 0]) {
  return { round, wins, phase: 'throw', dice: [rollDice(DICE, rng), rollDice(DICE, rng)], rolls: [0, 0], done: [false, false], ready: [false, false], timedOut: [false, false], result: null, idle: 0 };
}

function startMatch(data, one, two, now, rng, stake) {
  const match = { id: randomUUID(), players: [one.userId, two.userId], names: [one.name, two.name], dismissed: [], revision: 0, startedAt: now, deadline: now + THROW_TTL,
    stake: stake ? { ...stake, holders: [one.userId, two.userId], settled: false } : null, state: { phase: 'playing', winner: null }, game: freshGame(rng) };
  data.matches.push(match);
  for (const invite of data.invites) if (invite.status === 'pending' && match.players.includes(invite.from)) closeInvite(data, invite, 'cancelled', now);
  return match;
}

function finish(match, winner, now, kind) {
  match.state = { phase: 'matchOver', winner };
  match.game.phase = 'over'; match.endedAt = now; match.endKind = kind; match.revision += 1;
}

/** Both players stood: the better hand takes the round, and three rounds take the match. */
function settleRound(match, now) {
  const game = match.game, hands = game.dice.map(dice => evaluate(dice));
  const difference = compareHands(hands[0], hands[1]);
  const winner = difference > 0 ? 0 : difference < 0 ? 1 : 'draw';
  if (winner !== 'draw') game.wins[winner] += 1;
  game.result = { winner, hands: hands.map(hand => hand.name) };
  match.revision += 1;
  const lead = game.wins.findIndex(count => count >= ROUNDS_TO_WIN);
  if (lead >= 0) return finish(match, lead === 0 ? 'player' : 'ai', now, 'score');
  game.phase = 'result'; game.ready = [false, false]; match.deadline = now + RESULT_TTL;
}

function nextRound(match, now, rng) {
  const game = match.game;
  match.game = freshGame(rng, game.result?.winner === 'draw' ? game.round : game.round + 1, game.wins);
  match.game.idle = game.idle;
  match.deadline = now + THROW_TTL; match.revision += 1;
}

function sweep(data, now, rng) {
  for (const invite of data.invites) if (invite.status === 'pending' && invite.expiresAt <= now) closeInvite(data, invite, 'expired', now);
  for (const match of data.matches) {
    if (match.state.phase !== 'playing' || now < match.deadline) continue;
    const game = match.game;
    if (game.phase === 'throw') {
      game.timedOut = game.done.map(done => !done);
      game.done = [true, true];
      game.idle = game.timedOut.every(Boolean) ? game.idle + 1 : 0;
      if (game.idle >= IDLE_ROUNDS) { finish(match, 'draw', now, 'abandoned'); continue; }
      settleRound(match, now);
    } else if (game.phase === 'result') nextRound(match, now, rng);
  }
  data.matches = data.matches.filter(match => !match.endedAt || now - match.endedAt < DONE_TTL);
  data.invites = data.invites.filter(invite => now - invite.createdAt < DONE_TTL);
  settleStakes(data, now);
}

const nameOf = (people, id, saved) => people[id]?.name || saved || 'Игрок';
const friendsOf = (people, a, b) => (people[a]?.friends || []).map(String).includes(String(b)) && (people[b]?.friends || []).map(String).includes(String(a));

function inviteView(people, invite) {
  return { id: invite.id, from: invite.from, fromName: nameOf(people, invite.from, invite.fromName), to: invite.to, toName: nameOf(people, invite.to, invite.toName),
    stake: invite.stake || null, expiresAt: invite.expiresAt, status: invite.status };
}

/** The match as one seat sees it: their own dice, the other's only once the round is settled. */
export function diceMatchView(match, userId) {
  const me = match.players.indexOf(String(userId)), you = 1 - me, game = match.game;
  if (me < 0) return null;
  const open = game.phase !== 'throw';
  const winnerOf = value => (value === 'draw' ? 'draw' : value === me ? 'me' : 'opponent');
  return { id: match.id, round: game.round, phase: game.phase, deadline: match.deadline, opponent: match.names[you],
    wins: { me: game.wins[me], opponent: game.wins[you] }, dice: game.dice[me], rolls: game.rolls[me], done: game.done[me], opponentDone: game.done[you], opponentRolls: game.rolls[you],
    opponentDice: open ? game.dice[you] : null, ready: game.ready[me], opponentReady: game.ready[you],
    result: game.result ? { winner: winnerOf(game.result.winner), me: game.result.hands[me], opponent: game.result.hands[you] } : null,
    winner: game.phase === 'over' ? (match.state.winner === 'draw' ? 'draw' : match.state.winner === 'player' ? (me === 0 ? 'me' : 'opponent') : (me === 1 ? 'me' : 'opponent')) : null,
    endReason: match.endKind === 'surrender' ? (match.loser === me ? 'Вы сдались' : 'Соперник сдался') : match.endKind === 'abandoned' ? 'Оба игрока долго не отвечали, ставки возвращены' : '',
    stake: stakeView(match, userId) };
}

/**
 * `people` maps a user id to `{ name, friends, lastSeenAt }` for the player and everybody the request needs
 * (their friends, a player found by nickname).
 */
export function diceState(data, userId, now = Date.now(), { people = {}, rng = secure } = {}) {
  const id = String(userId);
  sweep(data, now, rng);
  const match = current(data, id);
  const friends = (people[id]?.friends || []).map(String).filter(friend => people[friend] && friendsOf(people, id, friend)).map(friend => ({ userId: friend, name: people[friend].name,
    ...presence(people[friend].lastSeenAt, now), busy: !!current(data, friend) })).sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name, 'ru'));
  return { ok: true, serverNow: now, match: match ? diceMatchView(match, id) : null, friends,
    incoming: data.invites.filter(invite => invite.status === 'pending' && invite.to === id).map(invite => inviteView(people, invite)),
    outgoing: data.invites.filter(invite => invite.status === 'pending' && invite.from === id).map(invite => inviteView(people, invite)) };
}

/** `options`: `people`, `wallet` (what the player can pay), `strangers` (ids found by nickname who may be invited). */
export function diceAction(data, userId, body, now = Date.now(), rng = secure, options = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Неизвестное действие');
  const id = String(userId), people = options.people || {};
  sweep(data, now, rng);
  const match = current(data, id);
  let charge = null;
  if (body.action === 'invite') {
    if (match) return fail('Сначала завершите текущую игру');
    const target = String(body.targetId ?? '');
    const stranger = (options.strangers || []).map(String).includes(target);
    if (!target || target === id || !people[target] || !(stranger || friendsOf(people, id, target))) return fail('Выберите друга или игрока по нику');
    if (current(data, target)) return fail('Игрок уже в игре');
    const parsed = parseStake(body.stake);
    if (!parsed.ok) return fail(parsed.error);
    const stake = parsed.stake;
    const same = data.invites.find(invite => invite.status === 'pending' && invite.from === id && invite.to === target && (invite.stake?.currency ?? null) === (stake?.currency ?? null) && (invite.stake?.amount ?? null) === (stake?.amount ?? null));
    if (!same) {
      if (data.invites.filter(invite => invite.status === 'pending' && invite.from === id).length >= 3) return fail('Можно создать не больше трёх приглашений одновременно');
      const broke = cannotPay(stake, options.wallet);
      if (broke) return fail(broke);
      data.invites.push({ id: randomUUID(), from: id, to: target, createdAt: now, expiresAt: now + INVITE_TTL, status: 'pending', fromName: nameOf(people, id), toName: nameOf(people, target), ...(stake ? { stake } : {}) });
      charge = stake;
    }
  } else if (body.action === 'cancel_invite' || body.action === 'decline_invite') {
    const invite = data.invites.find(item => item.id === body.inviteId && item.status === 'pending');
    if (!invite) return fail('Приглашение уже закрыто или истекло');
    if (body.action === 'cancel_invite' ? invite.from !== id : invite.to !== id) return fail('Это приглашение другого игрока');
    closeInvite(data, invite, body.action === 'cancel_invite' ? 'cancelled' : 'declined', now);
  } else if (body.action === 'accept_invite') {
    const invite = data.invites.find(item => item.id === body.inviteId && item.status === 'pending');
    if (!invite) return fail('Приглашение уже закрыто или истекло');
    if (invite.to !== id) return fail('Это приглашение другому игроку');
    if (match || current(data, invite.from)) return fail('Один из игроков уже в игре');
    const broke = cannotPay(invite.stake, options.wallet);
    if (broke) return fail(broke);
    invite.status = 'accepted';
    startMatch(data, { userId: invite.from, name: nameOf(people, invite.from, invite.fromName) }, { userId: id, name: nameOf(people, id) }, now, rng, invite.stake);
    charge = invite.stake || null;
  } else if (['throw', 'stand', 'ready', 'surrender'].includes(body.action)) {
    if (!match || match.id !== body.matchId) return fail('Матч не найден');
    if (match.state.phase !== 'playing') return fail('Матч завершён');
    const seat = match.players.indexOf(id), game = match.game;
    if (body.action === 'surrender') {
      const loser = seat; match.loser = loser;
      finish(match, loser === 0 ? 'ai' : 'player', now, 'surrender');
    } else if (body.action === 'ready') {
      if (game.phase !== 'result') return fail('Раунд ещё не закончен');
      game.ready[seat] = true; match.revision += 1;
      if (game.ready.every(Boolean)) nextRound(match, now, rng);
    } else {
      if (game.phase !== 'throw' || game.done[seat]) return fail('Вы уже закончили бросать');
      if (body.round !== game.round || body.rolls !== game.rolls[seat]) return fail('Состояние изменилось. Повторите ход');
      if (body.action === 'throw') {
        if (game.rolls[seat] >= REROLLS) return fail('Перебросов не осталось');
        const keep = new Set((Array.isArray(body.keep) ? body.keep : []).map(Number).filter(Number.isInteger));
        game.dice[seat] = game.dice[seat].map((value, i) => (keep.has(i) ? value : rollDice(1, rng)[0]));
        game.rolls[seat] += 1;
        if (game.rolls[seat] >= REROLLS) game.done[seat] = true;
      } else game.done[seat] = true;
      game.timedOut[seat] = false; game.idle = 0; match.revision += 1;
      if (game.done.every(Boolean)) settleRound(match, now);
    }
  } else if (body.action === 'dismiss') {
    if (!match || match.id !== body.matchId || match.state.phase !== 'matchOver') return fail('Матч ещё не завершён');
    match.dismissed.push(id);
  } else return fail('Неизвестное действие');
  settleStakes(data, now);
  return { ...diceState(data, id, now, { people, rng }), ...(charge ? { charge } : {}) };
}

export const diceFingerprint = data => JSON.stringify([
  data.invites.map(invite => [invite.id, invite.status]),
  data.matches.map(match => [match.id, match.revision, match.endedAt || 0, match.dismissed.length, match.stake?.settled ? 1 : 0]),
  data.credits.length,
]);
