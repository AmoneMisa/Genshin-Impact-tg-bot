import { randomUUID } from 'node:crypto';
import { aiLoadout, buildDeck } from '../webapp/gwent-builder.js';
import { createTable, playCard, passRound, resolveChoice, TABLE_SEATS } from '../webapp/gwent-engine.js';
import { decideAi } from '../webapp/gwent-ai.js';
import { RULESETS } from '../webapp/gwent-decks.js';

// Online tables of three or four players (extended rules). A table is a match of the shared lobby whose
// `players` list has one entry per seat; the seats of the engine are TABLE_SEATS in that order. Seats nobody
// takes, and seats whose player left or ran out of time, are played by the server's AI. A player always
// sees the table from their own seat: they are `player`, the next seat is `ai`, then `ai2` and `ai3`.

export const TABLE_SIZES = Object.freeze([3, 4]);
const BOT_LEVEL = 'medium';
const clone = value => structuredClone(value);

export const isBot = id => String(id).startsWith('bot:');
export const humansOf = match => match.players.filter(id => !isBot(id));
export const seatOf = (match, userId) => match.players.indexOf(String(userId));

/** The seat label (`player`, `ai`, ...) that table seat `index` has for the viewer sitting at `viewer`. */
const labelOf = (index, viewer, count) => TABLE_SEATS[(index - viewer + count) % count];

/** The engine seat a viewer's relative seat label stands for. */
export function absoluteSeat(match, viewerIndex, label) {
  const relative = TABLE_SEATS.indexOf(label);
  return relative < 0 || relative >= match.players.length ? undefined : TABLE_SEATS[(relative + viewerIndex) % match.players.length];
}

/**
 * The table's match record. `seated` are `{ userId, name, loadout }`. In a team match (two against two) the people take
 * the seats of the teams in turn: the first two people are teammates, the rest play against them.
 */
export function startTable(seated, size, now, { rng = Math.random, turnTtl, id = randomUUID(), teams = false } = {}) {
  const humans = seated.slice(0, size);
  const taken = new Set(humans.map(person => person.loadout.faction));
  const pool = RULESETS.extended.factions.filter(faction => !taken.has(faction));
  const order = teams && size === 4 ? [0, 2, 1, 3] : [0, 1, 2, 3];
  const slots = Array.from({ length: size }, () => null);
  humans.forEach((person, i) => { slots[order[i]] = person; });
  const players = [], names = [], loadouts = [];
  let bot = 0;
  for (const person of slots) {
    if (person) { players.push(String(person.userId)); names.push(person.name); loadouts.push(clone(person.loadout)); continue; }
    bot += 1;
    const faction = pool.splice(Math.floor(rng() * pool.length), 1)[0] || RULESETS.extended.factions[0];
    players.push(`bot:${bot}`); names.push(`Бот ${bot}`);
    loadouts.push(aiLoadout(faction, BOT_LEVEL, rng, 'extended'));
  }
  const match = { id, table: true, ruleset: 'extended', rated: null, players, names, factions: loadouts.map(loadout => loadout.faction), loadouts,
    dismissed: [], rematch: [], revision: 0, pushedAt: {}, deadline: now + turnTtl,
    state: createTable({ decks: loadouts.map(loadout => buildDeck(loadout)), seats: TABLE_SEATS.slice(0, size), rng, teams: teams && size === 4 }) };
  runBots(match, rng);
  return match;
}

const moverOf = state => (state.pending ? state.pending.side : state.turn);

/** Plays every seat of the AI whose turn it is, until a person must act or the match ends. */
export function runBots(match, rng = Math.random) {
  for (let guard = 0; guard < 600 && match.state.phase === 'playing'; guard += 1) {
    const seat = moverOf(match.state), index = TABLE_SEATS.indexOf(seat);
    if (index < 0 || !isBot(match.players[index])) return;
    const action = decideAi(match.state, seat, { level: BOT_LEVEL, rng });
    let result = !action ? null : action.type === 'choice' ? resolveChoice(match.state, seat, action.id)
      : action.type === 'pass' ? passRound(match.state, seat) : playCard(match.state, seat, action.uid, action);
    if (!result || result.error) result = passRound(match.state, seat);
    if (result.error) return;
    match.state = result.state; match.revision += 1;
  }
}

/** A person leaves the table (surrender or timeout): the AI takes their seat. Returns false once only the AI is left. */
export function replaceSeat(match, index, now, { turnTtl, rng = Math.random } = {}) {
  match.names[index] = `${match.names[index]} (бот)`;
  match.players[index] = `bot:left${index}`;
  match.revision += 1;
  if (!humansOf(match).length) {
    match.state.phase = 'matchOver'; match.state.winner = 'draw'; match.state.winners = []; match.state.pending = null;
    match.endedAt = now; match.endKind = 'abandoned';
    return false;
  }
  match.deadline = now + turnTtl;
  runBots(match, rng);
  if (match.state.phase === 'matchOver') match.endedAt = now;
  return true;
}

/**
 * The table as one seat sees it (`spectator`: from the first seat, with every hand hidden). Hidden information
 * stays on the server: decks, other hands, other players' reveals and ambushes this seat did not lay.
 */
export function tableMatchView(match, userId, { spectator = false, endReason = '' } = {}) {
  const count = match.players.length, viewer = spectator ? 0 : seatOf(match, userId);
  if (viewer < 0) return null;
  const abs = TABLE_SEATS.slice(0, count), mine = abs[viewer];
  const toRel = seat => (abs.includes(seat) ? labelOf(abs.indexOf(seat), viewer, count) : seat);
  const byRel = field => Object.fromEntries(abs.map(seat => [toRel(seat), field?.[seat]]));
  const state = clone(match.state);
  delete state.rngState; delete state.nextUid; delete state.setup;
  for (const seat of abs) {
    const side = state.sides[seat];
    side.deckCount = side.deck.length; side.handCount = side.hand.length; side.deck = [];
    // Teammates see each other's hands.
    if (spectator || (seat !== mine && !(state.teams && state.teams[seat] === state.teams[mine]))) side.hand = [];
    for (const row of Object.keys(side.traps || {})) {
      const trap = side.traps[row];
      side.traps[row] = trap && !spectator && (trap.by === mine || (state.teams && state.teams[trap.by] === state.teams[mine])) && seat !== mine && !(state.teams && state.teams[seat] === state.teams[mine]) ? { ...trap, by: toRel(trap.by) } : null;
    }
  }
  const reveals = byRel(state.reveals);
  for (const seat of abs) if (spectator || seat !== mine) reveals[toRel(seat)] = [];
  state.reveals = reveals;
  if (state.pending) {
    state.pending = spectator || state.pending.side !== mine ? { side: toRel(state.pending.side), kind: 'waiting', options: [] }
      : { ...state.pending, side: toRel(state.pending.side), options: (state.pending.options || []).map(option => (option.from ? { ...option, from: toRel(option.from) } : option)) };
  }
  state.sides = byRel(state.sides);
  for (const field of ['passed', 'tieWins', 'wins', 'points']) state[field] = byRel(state[field]);
  if (state.teams) state.teams = byRel(state.teams);
  state.seats = abs.slice();
  state.turn = toRel(state.turn); state.starter = toRel(state.starter); state.winner = toRel(state.winner);
  state.winners = (state.winners || []).map(toRel);
  const round = entry => ({ ...entry, winner: toRel(entry.winner), scores: byRel(entry.scores), ...(entry.points ? { points: byRel(entry.points) } : {}) });
  state.rounds = (state.rounds || []).map(round);
  if (state.lastRound) state.lastRound = round(state.lastRound);
  const names = Object.fromEntries(abs.map(seat => [toRel(seat), match.names[abs.indexOf(seat)]]));
  const factions = Object.fromEntries(abs.map(seat => [toRel(seat), match.factions[abs.indexOf(seat)]]));
  return { id: match.id, table: count, ruleset: 'extended', revision: match.revision, deadline: match.deadline, endReason, rematch: null,
    rated: match.tableRated && !spectator ? { table: true, change: match.tableRated.result?.[String(userId)] || null } : null,
    seatNames: names, seatFactions: factions, opponent: names.ai, faction: factions.player, enemyFaction: factions.ai, state,
    ...(spectator ? { spectator: true, playerName: names.player } : {}) };
}
