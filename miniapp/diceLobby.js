import crypto, { randomUUID } from 'node:crypto';
import { DICE, REROLLS, ROUNDS_TO_WIN, rollDice, evaluate, compareHands } from '../webapp/dice-poker.js';
import { STAKE_CURRENCIES, cannotPay, closeInvite, credit, parseStake, settleStakes, stakeView } from './gwentStakes.js';
import { presence } from './social.js';

// Dice poker between two players, with an optional stake (see gwentStakes.js: players only, never a house).
// Like Gwent it lives in one shared record, so friends meet across game chats. The server throws the dice.
// While a round is being thrown nobody sees the other's dice; they are shown when both have stood.
//
// A match keeps `state` in the shape the stake code reads (`phase`, `winner`: 'player' for the first seat,
// 'ai' for the second, 'draw') and the dice game itself in `game`.

/** Between rounds a player may raise by these multiples of the stake; nobody puts in more than this many stakes in all. */
export const RAISE_STEPS = Object.freeze([1, 2]);
export const MAX_STAKES = 4;
export const INVITE_TTL = 15 * 60_000;
export const THROW_TTL = 90_000;
export const RESULT_TTL = 45_000;
const DONE_TTL = 24 * 60 * 60_000;
const IDLE_ROUNDS = 2;
const fail = reason => ({ ok: false, reason, error: reason });
const secure = () => (crypto.randomInt(0, 6) + 0.5) / 6;

export const emptyDice = () => ({ invites: [], matches: [], credits: [] });

const mine = (data, id) => data.matches.filter(match => match.players.includes(id) && !match.dismissed.includes(id));
/** The match to show: a running one first, else the latest that was not closed yet. */
const current = (data, id) => mine(data, id).find(match => match.state.phase === 'playing') || mine(data, id).at(-1);
const playing = (data, id) => current(data, id)?.state.phase === 'playing';
const roomFor = (data, id) => data.invites.find(invite => invite.status === 'pending' && invite.from === id);

function freshGame(rng, round = 1, wins = [0, 0]) {
  return { round, wins, phase: 'throw', dice: [rollDice(DICE, rng), rollDice(DICE, rng)], rolls: [0, 0], done: [false, false], ready: [false, false], timedOut: [false, false], result: null, idle: 0 };
}

function startMatch(data, one, two, now, rng, stake) {
  const match = { id: randomUUID(), players: [one.userId, two.userId], names: [one.name, two.name], dismissed: [], revision: 0, startedAt: now, deadline: now + THROW_TTL,
    stake: stake ? { ...stake, holders: [one.userId, two.userId], paid: { [one.userId]: stake.amount, [two.userId]: stake.amount }, settled: false } : null, state: { phase: 'playing', winner: null }, game: freshGame(rng) };
  data.matches.push(match);
  // A finished match of these players is closed when they start the next one.
  for (const other of data.matches) if (other !== match && other.state.phase === 'matchOver') for (const id of match.players) if (other.players.includes(id) && !other.dismissed.includes(id)) other.dismissed.push(id);
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

function nextRound(match, now, rng, event = null) {
  const game = match.game;
  match.game = freshGame(rng, game.result?.winner === 'draw' ? game.round : game.round + 1, game.wins);
  match.game.idle = game.idle;
  if (event) match.game.event = event;
  match.deadline = now + THROW_TTL; match.revision += 1;
}

/** The raises a player may still make: whole stakes, within the limit of stakes put in. */
export function raiseOptions(stake, userId) {
  if (!stake) return [];
  const put = (stake.paid || {})[String(userId)] ?? stake.amount, max = STAKE_CURRENCIES[stake.currency].max;
  return RAISE_STEPS.map(step => step * stake.amount).filter(amount => put + amount <= MAX_STAKES * stake.amount && put + amount <= max);
}

/** The opponent of a raise did not call: the raiser gets the raise back and wins the round that was to be played. */
function foldRaise(data, match, now, rng) {
  const { by, amount } = match.game.raise, raiser = match.players[by];
  match.stake.paid[raiser] -= amount;
  credit(data, raiser, match.stake, 'refund', now, amount);
  match.game.wins[by] += 1;
  match.game.result = { winner: by, hands: match.game.result?.hands || ['', ''], folded: true };
  match.game.raise = null; match.revision += 1;
  if (match.game.wins[by] >= ROUNDS_TO_WIN) return finish(match, by === 0 ? 'player' : 'ai', now, 'score');
  match.game.round += 1; // the round that was given up counts as played
  nextRound(match, now, rng, { kind: 'fold', winner: by });
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
    } else if (game.phase === 'result') { if (game.raise) foldRaise(data, match, now, rng); else nextRound(match, now, rng); }
  }
  data.matches = data.matches.filter(match => !match.endedAt || now - match.endedAt < DONE_TTL);
  data.invites = data.invites.filter(invite => now - invite.createdAt < DONE_TTL);
  settleStakes(data, now);
}

const nameOf = (people, id, saved) => people[id]?.name || saved || 'Игрок';
const friendsOf = (people, a, b) => (people[a]?.friends || []).map(String).includes(String(b)) && (people[b]?.friends || []).map(String).includes(String(a));

function inviteView(people, invite) {
  return { id: invite.id, from: invite.from, fromName: nameOf(people, invite.from, invite.fromName), to: invite.to, toName: invite.to ? nameOf(people, invite.to, invite.toName) : null, open: !invite.to, rematch: !!invite.rematch,
    stake: invite.stake || null, expiresAt: invite.expiresAt, status: invite.status };
}

/** The match as one seat sees it: their own dice, the other's only once the round is settled. */
export function diceMatchView(match, userId) {
  const me = match.players.indexOf(String(userId)), you = 1 - me, game = match.game;
  if (me < 0) return null;
  const open = game.phase !== 'throw';
  const winnerOf = value => (value === 'draw' ? 'draw' : value === me ? 'me' : 'opponent');
  return { id: match.id, round: game.round, phase: game.phase, deadline: match.deadline, opponent: match.names[you], opponentId: match.players[you],
    wins: { me: game.wins[me], opponent: game.wins[you] }, dice: game.dice[me], rolls: game.rolls[me], done: game.done[me], opponentDone: game.done[you], opponentRolls: game.rolls[you],
    opponentDice: open ? game.dice[you] : null, ready: game.ready[me], opponentReady: game.ready[you],
    result: game.result ? { winner: winnerOf(game.result.winner), me: game.result.hands[me], opponent: game.result.hands[you] } : null,
    winner: game.phase === 'over' ? (match.state.winner === 'draw' ? 'draw' : match.state.winner === 'player' ? (me === 0 ? 'me' : 'opponent') : (me === 1 ? 'me' : 'opponent')) : null,
    endReason: match.endKind === 'surrender' ? (match.loser === me ? 'Вы сдались' : 'Соперник сдался') : match.endKind === 'abandoned' ? 'Оба игрока долго не отвечали, ставки возвращены' : '',
    raise: game.raise ? { by: game.raise.by === me ? 'me' : 'opponent', amount: game.raise.amount } : null, canRaise: !!match.stake && game.phase === 'result' && !game.raise ? raiseOptions(match.stake, userId) : [],
    event: game.event ? { kind: game.event.kind, winner: game.event.winner === me ? 'me' : 'opponent' } : null,
    stake: stakeView(match, userId) };
}

/**
 * `people` maps a user id to `{ name, friends, lastSeenAt }` for the player and everybody the request needs
 * (their friends, a player found by nickname).
 */
export function diceState(data, userId, now = Date.now(), { people = {}, rng = secure, invite = null } = {}) {
  const id = String(userId);
  sweep(data, now, rng);
  const match = current(data, id);
  const friends = (people[id]?.friends || []).map(String).filter(friend => people[friend] && friendsOf(people, id, friend)).map(friend => ({ userId: friend, name: people[friend].name,
    ...presence(people[friend].lastSeenAt, now), busy: playing(data, friend) })).sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name, 'ru'));
  const shown = invite ? data.invites.find(item => item.id === invite && (!item.to || item.to === id || item.from === id)) : null;
  if (invite && !shown) return fail('Приглашение недоступно');
  return { ok: true, serverNow: now, match: match ? diceMatchView(match, id) : null, friends, ...(shown ? { invitation: { ...inviteView(people, shown), mine: shown.from === id } } : {}),
    incoming: data.invites.filter(invite => invite.status === 'pending' && invite.to === id).map(invite => inviteView(people, invite)),
    outgoing: data.invites.filter(invite => invite.status === 'pending' && invite.from === id).map(invite => inviteView(people, invite)) };
}

/** `options`: `people`, `wallet` (what the player can pay), `strangers` (ids found by nickname who may be invited). */
export function diceAction(data, userId, body, now = Date.now(), rng = secure, options = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Неизвестное действие');
  const id = String(userId), people = options.people || {};
  sweep(data, now, rng);
  const match = current(data, id);
  let charge = null, notify = null;
  if (body.action === 'invite' || body.action === 'rematch') {
    if (playing(data, id)) return fail('Сначала завершите текущую игру');
    const rematch = body.action === 'rematch';
    // A rematch goes to the opponent of the finished match, with the same stake; a link is open to anybody.
    const finished = rematch ? match : null;
    if (rematch && (!finished || finished.id !== body.matchId || finished.state.phase !== 'matchOver')) return fail('Реванш доступен после окончания матча');
    const open = !rematch && body.open === true;
    const target = open ? null : rematch ? finished.players.find(player => player !== id) : String(body.targetId ?? '');
    const stranger = !rematch && (options.strangers || []).map(String).includes(target);
    if (!open && (!target || target === id || (!rematch && (!people[target] || !(stranger || friendsOf(people, id, target)))))) return fail('Выберите друга или игрока по нику');
    if (target && playing(data, target)) return fail('Игрок уже в игре');
    const parsed = rematch ? { ok: true, stake: finished.stake ? { currency: finished.stake.currency, amount: finished.stake.amount } : null } : parseStake(body.stake);
    if (!parsed.ok) return fail(parsed.error);
    const stake = parsed.stake;
    const same = data.invites.find(invite => invite.status === 'pending' && invite.from === id && (invite.to ?? null) === target && (invite.stake?.currency ?? null) === (stake?.currency ?? null) && (invite.stake?.amount ?? null) === (stake?.amount ?? null));
    if (!same) {
      if (data.invites.filter(invite => invite.status === 'pending' && invite.from === id).length >= 3) return fail('Можно создать не больше трёх приглашений одновременно');
      const broke = cannotPay(stake, options.wallet);
      if (broke) return fail(broke);
      data.invites.push({ id: randomUUID(), from: id, to: target, createdAt: now, expiresAt: now + INVITE_TTL, status: 'pending', fromName: nameOf(people, id), toName: target ? nameOf(people, target) : null, ...(rematch ? { rematch: true } : {}), ...(stake ? { stake } : {}) });
      charge = stake;
      if (target) notify = { kind: rematch ? 'rematch' : 'invite', userId: target, fromName: nameOf(people, id), inviteId: data.invites.at(-1).id };
    }
  } else if (body.action === 'cancel_invite' || body.action === 'decline_invite') {
    const invite = data.invites.find(item => item.id === body.inviteId && item.status === 'pending');
    if (!invite) return fail('Приглашение уже закрыто или истекло');
    if (body.action === 'cancel_invite' ? invite.from !== id : invite.to !== id) return fail('Это приглашение другого игрока');
    closeInvite(data, invite, body.action === 'cancel_invite' ? 'cancelled' : 'declined', now);
  } else if (body.action === 'accept_invite') {
    const invite = data.invites.find(item => item.id === body.inviteId && item.status === 'pending');
    if (!invite) return fail('Приглашение уже закрыто или истекло');
    if (invite.to ? invite.to !== id : invite.from === id) return fail('Это приглашение другому игроку');
    if (playing(data, id) || playing(data, invite.from)) return fail('Один из игроков уже в игре');
    const broke = cannotPay(invite.stake, options.wallet);
    if (broke) return fail(broke);
    invite.status = 'accepted'; invite.to = id;
    startMatch(data, { userId: invite.from, name: nameOf(people, invite.from, invite.fromName) }, { userId: id, name: nameOf(people, id) }, now, rng, invite.stake);
    charge = invite.stake || null;
    notify = { kind: 'start', userId: invite.from, fromName: nameOf(people, id), inviteId: invite.id };
  } else if (['raise', 'call', 'fold'].includes(body.action)) {
    if (!match || match.id !== body.matchId) return fail('Матч не найден');
    if (match.state.phase !== 'playing') return fail('Матч завершён');
    if (!match.stake) return fail('В этой игре нет ставки');
    const seat = match.players.indexOf(id), game = match.game;
    if (game.phase !== 'result') return fail('Ставку можно менять между раундами');
    if (body.action === 'raise') {
      if (game.raise) return fail('Ставка уже повышена');
      const amount = Number(body.amount);
      if (!raiseOptions(match.stake, id).includes(amount)) return fail('Такое повышение недоступно');
      const raise = { currency: match.stake.currency, amount }, broke = cannotPay(raise, options.wallet);
      if (broke) return fail(broke);
      match.stake.paid[id] += amount; charge = raise;
      game.raise = { by: seat, amount }; game.ready = [false, false]; match.deadline = now + RESULT_TTL; match.revision += 1;
      notify = { kind: 'raise', userId: match.players[1 - seat], fromName: nameOf(people, id), inviteId: null };
    } else {
      if (!game.raise || game.raise.by === seat) return fail('Нет повышения, на которое можно ответить');
      if (body.action === 'call') {
        const call = { currency: match.stake.currency, amount: game.raise.amount }, broke = cannotPay(call, options.wallet);
        if (broke) return fail(broke);
        match.stake.paid[id] += call.amount; charge = call;
        game.raise = null;
        nextRound(match, now, rng);
      } else foldRaise(data, match, now, rng);
    }
  } else if (['throw', 'stand', 'ready', 'surrender'].includes(body.action)) {
    if (!match || match.id !== body.matchId) return fail('Матч не найден');
    if (match.state.phase !== 'playing') return fail('Матч завершён');
    const seat = match.players.indexOf(id), game = match.game;
    if (body.action === 'surrender') {
      const loser = seat; match.loser = loser;
      finish(match, loser === 0 ? 'ai' : 'player', now, 'surrender');
    } else if (body.action === 'ready') {
      if (game.phase !== 'result') return fail('Раунд ещё не закончен');
      if (game.raise) return fail('Сначала ответьте на повышение ставки');
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
  return { ...diceState(data, id, now, { people, rng }), ...(charge ? { charge } : {}), ...(notify ? { notify } : {}) };
}

export const diceFingerprint = data => JSON.stringify([
  data.invites.map(invite => [invite.id, invite.status]),
  data.matches.map(match => [match.id, match.revision, match.endedAt || 0, match.dismissed.length, match.stake?.settled ? 1 : 0]),
  data.credits.length,
]);
