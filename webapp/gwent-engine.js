// Gwent rules engine: a pure state machine with no DOM access, so it can run in the
// browser and under node:test. Every action returns a new state or an error.
//
// Rules implemented (Witcher 3 style):
// - Three rows per side: close, ranged, siege. Units can only be placed in their rows.
// - Players alternate. Passing is final for the round. A player with no legal play passes.
// - A round ends when both players have passed. Higher total strength wins the round.
// - At the end of a round every card on the board, heroes included, goes to the graveyard.
// - Weather is cleared at the end of every round. Doubles from leaders also end with the round.
// - Match: first to two round wins. Both players draw 10 cards once, may swap up to two of them
//   before the first round, and draw no cards between rounds (CD Projekt's Gwent manual).
// - The first player is a coin toss; Scoiatael decide instead. The winner of a round starts the next.
// - Faction passives: Northern Realms draw a card after winning a round, Nilfgaard wins drawn rounds,
//   Monsters keep one random non-hero unit on the board after each round, Skellige return two random
//   non-hero units from the graveyard to the board at the start of round 3.
// - Bond multiplies a unit by the number of same-bond units in its row.
// - Morale adds +1 to every other unit in its row. Horn (unit or special) doubles non-hero units in its row.
// - Muster summons every other card of its group from the deck into the same row ("twin" = same name).
// - Weather sets the base strength of non-hero units in its row to 1 (both players).
// - Spy is played onto the opponent's board, and its owner draws 2 cards.
// - Medic returns the strongest non-hero unit from the graveyard to its row when played.
// - Mardroeme (special or unit ability) turns the berserkers in its row into their transformed form.
// - Conditional scorch (unit or leader): if the enemy row's total reaches the threshold, the strongest
//   non-hero units of the target row are destroyed.
// - Kambi summons Heimdall, the cow summons the cow army, when destroyed (not at the end of a round).
// - Decoy swaps with a non-hero unit of your own. Scorch destroys the strongest non-hero units.
// - Each player has one leader per match with a one-shot effect; the spent leader card goes to the
//   graveyard. Some leaders are passive.
//
// Spells (extended rules, special cards): fireball destroys the strongest non-hero units in an enemy row; curse and
// blessing lower or raise every non-hero unit of a row by `amount` (2 by default) until the round ends; teleport moves
// one of the player's units to another row; recall returns a unit from the graveyard to the hand. An ambush may
// release another token than the squirrel (`trapToken`).
//
// Extended rules (cards of the new factions only):
// - A unit with `swap` returns one of its owner's units from the board to the hand when it is played.
// - Ambush (special card) is laid hidden in a row of the opponent. When the opponent plays a unit into that
//   row, the ambush is sprung: two squirrels appear in the same row on the side that laid it.
// - A leader with `moveAny` moves up to three non-hero units to other rows.
// - Faction passives: Velen units keep up to 3 strength in weather, Redania spies draw three cards, Toussaint may swap
//   three cards at the start, Witchers get a random hero back from the graveyard into the hand at the start of round 3, Wild Hunt draw a card after a lost round.
//
// Assumptions not confirmed by a source: a drawn round gives both players a round win, after a drawn
// round the side that did not start it starts, Scoiatael decide only the first turn of the match, weather sets the base strength
// to 1 before bond, morale and horn, King Bran halves strength in weather, and a leader's doubling
// lasts until the end of the round. Choices that the original leaves to the player are made
// by the player through a pending choice (see askChoice / resolveChoice).

import { ROWS, ROW_LABELS, expandDeck, TOKENS } from './gwent-decks.js';

export const SIDES = Object.freeze(['player', 'ai']);
export const OPPONENT = Object.freeze({ player: 'ai', ai: 'player' });
export const HAND_SIZE = 10;
export const ROUNDS_TO_WIN = 2;

const clone = value => structuredClone(value);
const noWeather = () => ({ close: false, ranged: false, siege: false });
const noDoubles = () => ({ close: false, ranged: false, siege: false });
const noTraps = () => ({ close: null, ranged: null, siege: null });
const noMods = () => ({ close: 0, ranged: 0, siege: 0 });
const isPassiveLeader = leader => leader.effect.type.startsWith('passive-');

/** Deterministic random numbers kept in the state, so a saved match replays the same way. */
function random(state) {
  state.rngState = (state.rngState * 16807) % 2147483647;
  return (state.rngState - 1) / 2147483646;
}

function shuffle(state, list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random(state) * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function newUid(state) {
  const uid = state.nextUid;
  state.nextUid += 1;
  return uid;
}

function makeToken(state, id) {
  return { ...TOKENS[id], uid: newUid(state) };
}

function drawCards(side, count) {
  for (let i = 0; i < count && side.deck.length > 0; i += 1) side.hand.push(side.deck.shift());
}

/** Sets the weather for the rows a card names. 'clear' removes all weather. */
function applyWeather(state, weather) {
  if (weather === 'clear') {
    state.weather = noWeather();
    return;
  }
  for (const row of Array.isArray(weather) ? weather : [weather]) state.weather[row] = true;
}

/** Creates a match. `playerDeck` and `aiDeck` are deck definitions from gwent-decks.js. */
export function createMatch({ playerDeck, aiDeck, rng = Math.random, setup = true }) {
  const state = {
    round: 1,
    starter: 'player',
    turn: 'player',
    passed: { player: false, ai: false },
    sides: {},
    weather: noWeather(),
    reveals: { player: [], ai: [] },
    pending: null,    // { side, kind, options, ... } while a player must choose a card or a row
    reviveAny: false,
    tieWins: { player: Boolean(playerDeck.tieWins), ai: Boolean(aiDeck.tieWins) },
    rngState: Math.floor(rng() * 2147483645) + 1,
    nextUid: 1,
    wins: { player: 0, ai: 0 },
    phase: 'playing', // 'playing' | 'matchOver'
    winner: null,     // 'player' | 'ai' | 'draw' once matchOver
    lastRound: null,  // { round, scores, winner } of the last finished round
    rounds: [],       // every finished round, for the result screen
    setup: null,      // pending start-of-match steps: mulligans and the first-turn choice
    ruleset: playerDeck.ruleset === 'extended' || aiDeck.ruleset === 'extended' ? 'extended' : 'classic',
  };
  for (const side of SIDES) {
    const def = side === 'player' ? playerDeck : aiDeck;
    const deckCards = expandDeck(def).map(card => ({ ...card, uid: newUid(state) }));
    const pool = def.leaders || [];
    const pick = pool.length ? pool[Math.floor(rng() * pool.length)] : null;
    const leader = pick ? { ...pick, type: 'leader', uid: newUid(state) } : null;
    state.sides[side] = {
      deck: shuffle(state, deckCards),
      hand: [],
      graveyard: [],
      rows: { close: [], ranged: [], siege: [] },
      leader,
      leaderUsed: false,
      leaderCancelled: false,
      faction: def.id,
      doubled: noDoubles(),
      traps: noTraps(), // ambushes the opponent laid in this side's rows (hidden from this side)
      mods: noMods(),   // strength added to (blessing) or taken from (curse) every non-hero unit of a row this round
      kingBran: leader?.effect.type === 'passive-bran',
      extraDraw: leader?.effect.type === 'passive-extra-draw',
    };
  }
  for (const side of SIDES) drawCards(state.sides[side], HAND_SIZE);
  for (const side of SIDES) if (state.sides[side].extraDraw) drawCards(state.sides[side], 1);
  state.starter = random(state) < 0.5 ? 'player' : 'ai';
  state.turn = state.starter;
  if (setup) {
    state.setup = ['mulligan:player', 'mulligan:ai', 'first'];
    stepSetup(state);
  } else {
    advance(state, null);
  }
  return state;
}

/** Runs the start-of-match steps until one needs a choice. Afterwards the first round begins. */
function stepSetup(state) {
  while (state.setup && state.setup.length > 0) {
    const step = state.setup.shift();
    if (step.startsWith('mulligan:')) {
      const side = step.slice(9);
      if (offerMulligan(state, side, state.sides[side].faction === 'toussaint' ? 3 : 2)) return;
    } else if (step === 'first') {
      const scoia = SIDES.filter(side => state.sides[side].faction === 'scoiatael');
      if (scoia.length === 1) {
        askChoice(state, scoia[0], 'first', [{ id: 'self', label: 'Я хожу первым' }, { id: 'enemy', label: 'Первым ходит соперник' }]);
        return;
      }
    }
  }
  state.setup = null;
  advance(state, null);
}

/** Swap up to `remaining` hand cards for new ones from the deck. 'done' ends the swapping. */
function offerMulligan(state, side, remaining) {
  const mine = state.sides[side];
  if (mine.deck.length === 0 || mine.hand.length === 0) return false;
  const options = [...mine.hand.map(card => ({ id: card.uid, card })), { id: 'done', label: 'Оставить руку' }];
  return askChoice(state, side, 'mulligan', options, { remaining });
}

/**
 * Strength of every card in one row. `opts`: `doubled` (leader doubling, unless a horn is present)
 * and `halve` (King Bran: units lose half their strength in weather).
 */
export function rowValues(row, weatherActive = false, opts = {}) {
  const horn = row.some(card => card.horn || card.special === 'horn');
  const morales = row.filter(card => card.type === 'unit' && card.morale).length;
  const bondCounts = {};
  for (const card of row) if (card.type === 'unit' && card.bond) bondCounts[card.bond] = (bondCounts[card.bond] || 0) + 1;
  return row.map(card => {
    if (card.type !== 'unit') return 0;
    if (card.hero) return card.strength;
    let base = weatherActive ? Math.min(card.strength, opts.weatherBase ?? 1) : card.strength;
    if (opts.rowMod && card.strength > 0) base = Math.max(1, base + opts.rowMod); // curse and blessing
    let value = base + morales - (card.morale ? 1 : 0);
    if (card.bond) value *= bondCounts[card.bond];
    if (horn || opts.doubled) value *= 2;
    if (opts.halve && weatherActive) value = Math.floor(value / 2);
    return value;
  });
}

/** Row values with the side's leader and passive effects applied. */
export function rowValuesFor(state, side, row) {
  const mine = state.sides[side];
  return rowValues(mine.rows[row], state.weather[row], { doubled: mine.doubled[row], halve: mine.kingBran, weatherBase: mine.faction === 'velen' ? 3 : 1, rowMod: mine.mods?.[row] || 0 });
}

/** Total strength of one side. Spies count for the side whose row they stand in. */
export function sideScore(state, side) {
  return ROWS.reduce((sum, row) => sum + rowValuesFor(state, side, row).reduce((a, b) => a + b, 0), 0);
}

export function scores(state) {
  return { player: sideScore(state, 'player'), ai: sideScore(state, 'ai') };
}

function boardValues(state) {
  return SIDES.flatMap(side => ROWS.flatMap(row => {
    const values = rowValuesFor(state, side, row);
    return state.sides[side].rows[row].map((card, index) => ({ side, row, card, value: values[index] }));
  }));
}

/** The legal actions of a side as { uid, row?, targetUid? }. Empty when it is not that side's turn. */
export function legalPlays(state, side) {
  if (state.pending || state.phase !== 'playing' || state.turn !== side || state.passed[side]) return [];
  const me = state.sides[side];
  const plays = [];
  const ownUnits = ROWS.flatMap(row => me.rows[row].filter(card => card.type === 'unit' && !card.hero));
  if (me.leader && !me.leaderUsed && !me.leaderCancelled && !isPassiveLeader(me.leader)) plays.push({ uid: me.leader.uid });
  for (const card of me.hand) {
    if (card.type === 'unit') {
      for (const row of card.agile ? card.rows : [card.rows[0]]) {
        plays.push({ uid: card.uid, row });
        // A swap unit may also send one of the player's units back to the hand.
        if (card.swap) for (const target of ownUnits) plays.push({ uid: card.uid, row, targetUid: target.uid });
      }
    } else if (card.special === 'fireball' || card.special === 'curse') {
      for (const row of ROWS) if (state.sides[OPPONENT[side]].rows[row].some(unit => unit.type === 'unit' && !unit.hero)) plays.push({ uid: card.uid, row });
    } else if (card.special === 'blessing') {
      for (const row of ROWS) if (me.rows[row].some(unit => unit.type === 'unit' && !unit.hero)) plays.push({ uid: card.uid, row });
    } else if (card.special === 'teleport') {
      for (const from of ROWS) for (const unit of me.rows[from]) {
        if (unit.type !== 'unit' || unit.hero) continue;
        for (const row of ROWS) if (row !== from) plays.push({ uid: card.uid, row, targetUid: unit.uid });
      }
    } else if (card.special === 'recall') {
      if (me.graveyard.some(item => item.type === 'unit' && !item.hero)) plays.push({ uid: card.uid });
    } else if (card.special === 'ambush') {
      for (const row of ROWS) if (!state.sides[OPPONENT[side]].traps?.[row]) plays.push({ uid: card.uid, row });
    } else if (card.special === 'horn' || card.special === 'mardroeme') {
      for (const row of ROWS) plays.push({ uid: card.uid, row });
    } else if (card.special === 'decoy') {
      for (const target of ownUnits) plays.push({ uid: card.uid, targetUid: target.uid });
    } else if (card.special === 'scorch' || card.special === 'weather') {
      plays.push({ uid: card.uid });
    }
  }
  return plays;
}

function findOnBoard(state, side, uid) {
  for (const row of ROWS) {
    const index = state.sides[side].rows[row].findIndex(card => card.uid === uid);
    if (index >= 0) return { row, index };
  }
  return null;
}

/** Makes `side` choose one of `options` ({ id, card?, label? }) before the match goes on. */
function askChoice(state, side, kind, options, extra = {}) {
  if (options.length === 0) return false;
  state.pending = { side, kind, options, ...extra };
  return true;
}

function takeFrom(list, uid) {
  const index = list.findIndex(card => card.uid === uid);
  return index < 0 ? null : list.splice(index, 1)[0];
}

/** Medic: the player chooses which unit from the graveyard returns to the medic's row. */
function offerRevive(state, side, row) {
  const options = state.sides[side].graveyard
    .filter(card => card.type === 'unit' && (state.reviveAny || !card.hero))
    .map(card => ({ id: card.uid, card }));
  askChoice(state, side, 'revive', options, { row });
}

/** The leader Hope of the Aen Seidhe, extended: up to `remaining` non-hero units move to rows of the player's choice. */
function askMoveAny(state, side, remaining) {
  const options = ROWS.flatMap(row => state.sides[side].rows[row].filter(card => card.type === 'unit' && !card.hero).map(card => ({ id: card.uid, card })));
  if (options.length === 0) return;
  askChoice(state, side, 'moveFrom', [...options, { id: 'done', label: 'Готово' }], { remaining });
}

/** Agile units are placed one by one: the player picks the row for each. */
function askAgile(state, side, queue) {
  let rest = queue;
  while (rest.length > 0) {
    const from = findOnBoard(state, side, rest[0]);
    const card = from && state.sides[side].rows[from.row][from.index];
    if (card && card.rows.length > 1) {
      askChoice(state, side, 'agile', card.rows.map(row => ({ id: row, label: ROW_LABELS[row] })), {
        uid: card.uid, card, queue: rest.slice(1),
      });
      return;
    }
    rest = rest.slice(1);
  }
}

/** Applies the player's choice. A discard continues with a second pick and then a draw. */
function applyChoice(state, side, pending, option) {
  const mine = state.sides[side];
  const enemy = state.sides[OPPONENT[side]];
  switch (pending.kind) {
    case 'revive': {
      const card = takeFrom(mine.graveyard, option.id);
      if (card) mine.rows[pending.row].push(card);
      break;
    }
    case 'takeGrave': {
      const card = takeFrom(enemy.graveyard, option.id);
      if (card) mine.hand.push(card);
      break;
    }
    case 'returnGrave': {
      const card = takeFrom(mine.graveyard, option.id);
      if (card) mine.hand.push(card);
      break;
    }
    case 'discard': {
      const card = takeFrom(mine.hand, option.id);
      if (card) mine.graveyard.push(card);
      const remaining = (pending.remaining || 1) - 1;
      if (remaining > 0 && mine.hand.length > 0) {
        askChoice(state, side, 'discard', mine.hand.map(item => ({ id: item.uid, card: item })), { remaining });
      } else {
        askChoice(state, side, 'drawAny', mine.deck.map(item => ({ id: item.uid, card: item })));
      }
      break;
    }
    case 'drawAny': {
      const card = takeFrom(mine.deck, option.id);
      if (card) mine.hand.push(card);
      break;
    }
    case 'weather': {
      const card = takeFrom(mine.deck, option.id);
      if (card) {
        mine.graveyard.push(card);
        applyWeather(state, card.weather);
      }
      break;
    }
    case 'mulligan': {
      if (option.id === 'done') break;
      const card = takeFrom(mine.hand, option.id);
      if (card) {
        mine.deck.push(card);
        shuffle(state, mine.deck);
        drawCards(mine, 1);
      }
      if (pending.remaining > 1) offerMulligan(state, side, pending.remaining - 1);
      break;
    }
    case 'first': {
      state.starter = option.id === 'self' ? side : OPPONENT[side];
      state.turn = state.starter;
      break;
    }
    case 'moveFrom': {
      if (option.id === 'done') break;
      const from = findOnBoard(state, side, option.id);
      if (!from) break;
      askChoice(state, side, 'moveTo', ROWS.filter(row => row !== from.row).map(row => ({ id: row, label: ROW_LABELS[row] })), { uid: option.id, remaining: pending.remaining });
      break;
    }
    case 'moveTo': {
      const from = findOnBoard(state, side, pending.uid);
      if (from) {
        const [card] = mine.rows[from.row].splice(from.index, 1);
        mine.rows[option.id].push(card);
      }
      if (pending.remaining > 1) askMoveAny(state, side, pending.remaining - 1);
      break;
    }
    case 'agile': {
      const from = findOnBoard(state, side, pending.uid);
      if (from) {
        const [card] = state.sides[side].rows[from.row].splice(from.index, 1);
        state.sides[side].rows[option.id].push(card);
      }
      askAgile(state, side, pending.queue);
      break;
    }
    default:
      break;
  }
}

/** The player (or the AI) names an option of a pending choice. The turn moves on when nothing follows. */
export function resolveChoice(state, side, id) {
  if (!state.pending) return { error: 'Сейчас выбирать не нужно.' };
  if (state.pending.side !== side) return { error: 'Этот выбор делает другой игрок.' };
  const option = state.pending.options.find(item => item.id === id);
  if (!option) return { error: 'Такого варианта нет.' };
  const next = clone(state);
  const pending = next.pending;
  next.pending = null;
  applyChoice(next, side, pending, option);
  if (!next.pending) {
    if (next.setup) stepSetup(next);
    else advance(next, side);
  }
  return { state: next };
}

/** The option the AI picks: the strongest card, the weakest one when discarding. */
export function aiChoiceId(state) {
  const pending = state.pending;
  if (!pending) return null;
  if (pending.kind === 'agile') return pending.options[0].id;
  if (pending.kind === 'first') return 'self';
  if (pending.kind === 'moveFrom') {
    // Take a unit out of a row under weather; nothing to rescue means nothing to move.
    const trapped = pending.options.find(option => option.card && ROWS.some(row => state.weather[row] && state.sides[pending.side].rows[row].some(card => card.uid === option.id)));
    return trapped ? trapped.id : 'done';
  }
  if (pending.kind === 'moveTo') return (pending.options.find(option => !state.weather[option.id]) || pending.options[0]).id;
  if (pending.kind === 'mulligan') {
    const weak = pending.options.find(option => option.card?.type === 'unit' && !option.card.hero
      && option.card.strength <= 2 && !option.card.bond && !option.card.muster && !option.card.spy && !option.card.medic && !option.card.morale);
    return weak ? weak.id : 'done';
  }
  const strength = option => option.card?.strength || 0;
  const sorted = [...pending.options].sort((a, b) => (pending.kind === 'discard'
    ? strength(a) - strength(b)
    : strength(b) - strength(a)));
  return sorted[0].id;
}

/** Plays a card from hand or the leader. Options: row (agile units and horns), targetUid (decoy). */
export function playCard(state, side, uid, { row, targetUid } = {}) {
  if (state.pending) return { error: 'Сначала сделай выбор.' };
  if (state.phase !== 'playing') return { error: 'Раунд уже завершён.' };
  if (state.turn !== side || state.passed[side]) return { error: 'Сейчас не твой ход.' };
  const next = clone(state);
  const mine = next.sides[side];

  if (mine.leader && mine.leader.uid === uid) {
    if (mine.leaderUsed) return { error: 'Лидер уже использован.' };
    if (mine.leaderCancelled) return { error: 'Способность лидера отменена.' };
    if (isPassiveLeader(mine.leader)) return { error: 'Этот лидер действует постоянно.' };
    mine.leaderUsed = true;
    mine.graveyard.push({ ...mine.leader });
    runLeader(next, side, mine.leader.effect);
    if (!next.pending) advance(next, side);
    return { state: next };
  }

  const index = mine.hand.findIndex(card => card.uid === uid);
  if (index < 0) return { error: 'Этой карты нет в руке.' };
  const card = mine.hand.splice(index, 1)[0];

  if (card.type === 'unit') {
    const target = card.agile && row ? row : card.rows[0];
    if (!card.rows.includes(target)) return { error: 'Эта карта не может стоять в этом ряду.' };
    if (card.onPlay?.type === 'scorchAll') {
      // Pirate: the strongest units on the board are destroyed, then the card itself goes to the graveyard.
      scorchAll(next);
      mine.graveyard.push(card);
    } else if (card.spy) {
      next.sides[OPPONENT[side]].rows[target].push(card);
      drawCards(mine, mine.faction === 'redania' ? 3 : 2);
    } else {
      mine.rows[target].push(card);
      springAmbush(next, side, target);
      if (card.swap && targetUid !== undefined) {
        const spot = findOnBoard(next, side, targetUid);
        const swapped = spot && mine.rows[spot.row][spot.index];
        if (!swapped || swapped.uid === card.uid || swapped.type !== 'unit' || swapped.hero) return { error: 'Подмена возвращает только свой обычный отряд.' };
        mine.rows[spot.row].splice(spot.index, 1);
        mine.hand.push(swapped);
      }
      if (card.muster) musterInto(next, side, card, target);
      if (card.onPlay) runUnitOnPlay(next, side, card, target);
      if (card.medic) offerRevive(next, side, target);
    }
  } else if (card.special === 'fireball' || card.special === 'curse' || card.special === 'blessing') {
    if (!ROWS.includes(row)) return { error: 'Выбери ряд для заклинания.' };
    if (card.special === 'fireball') scorchEnemy(next, side, { target: row, cond: row, threshold: 0 });
    else {
      const owner = next.sides[card.special === 'curse' ? OPPONENT[side] : side];
      owner.mods ||= noMods();
      owner.mods[row] += (card.special === 'curse' ? -1 : 1) * (card.amount || 2);
    }
    mine.graveyard.push(card);
  } else if (card.special === 'teleport') {
    const spot = findOnBoard(next, side, targetUid);
    const unit = spot && mine.rows[spot.row][spot.index];
    if (!unit || unit.type !== 'unit' || unit.hero) return { error: 'Телепортация переносит только свой обычный отряд.' };
    if (!ROWS.includes(row) || row === spot.row) return { error: 'Выбери другой ряд.' };
    mine.rows[spot.row].splice(spot.index, 1);
    mine.rows[row].push(unit);
    mine.graveyard.push(card);
  } else if (card.special === 'recall') {
    mine.graveyard.push(card);
    const options = mine.graveyard.filter(item => item.type === 'unit' && !item.hero).map(item => ({ id: item.uid, card: item }));
    if (options.length === 0) return { error: 'В отбое нет отрядов.' };
    askChoice(next, side, 'returnGrave', options);
  } else if (card.special === 'ambush') {
    const foe = next.sides[OPPONENT[side]];
    if (!ROWS.includes(row)) return { error: 'Выбери ряд для засады.' };
    foe.traps ||= noTraps();
    if (foe.traps[row]) return { error: 'В этом ряду уже есть засада.' };
    foe.traps[row] = card;
  } else if (card.special === 'horn') {
    if (!ROWS.includes(row)) return { error: 'Выбери ряд для рога.' };
    mine.rows[row].push(card);
  } else if (card.special === 'mardroeme') {
    if (!ROWS.includes(row)) return { error: 'Выбери ряд для мардрём.' };
    mine.rows[row].push(card);
    transformBerserkers(next, side, row);
  } else if (card.special === 'decoy') {
    const spot = findOnBoard(next, side, targetUid);
    const target = spot && mine.rows[spot.row][spot.index];
    if (!target || target.type !== 'unit' || target.hero) return { error: 'Чучело заменяет только свой обычный отряд.' };
    mine.rows[spot.row][spot.index] = card;
    mine.hand.push(target); // the target returns to hand with its uid
  } else if (card.special === 'scorch') {
    scorchAll(next);
    mine.graveyard.push(card);
  } else if (card.special === 'weather') {
    applyWeather(next, card.weather);
    mine.graveyard.push(card);
  } else {
    return { error: 'Неизвестная карта.' };
  }

  if (!next.pending) advance(next, side);
  return { state: next };
}

export function passRound(state, side) {
  if (state.pending) return { error: 'Сначала сделай выбор.' };
  if (state.phase !== 'playing') return { error: 'Раунд уже завершён.' };
  if (state.turn !== side || state.passed[side]) return { error: 'Сейчас не твой ход.' };
  const next = clone(state);
  next.passed[side] = true;
  advance(next, side);
  return { state: next };
}

/** The opponent's ambush in this row, if any, goes off: two squirrels appear for whoever laid it. */
function springAmbush(state, side, row) {
  const traps = state.sides[side].traps ||= noTraps(); // matches saved before ambushes existed
  const trap = traps[row];
  if (!trap) return;
  traps[row] = null;
  const owner = state.sides[OPPONENT[side]];
  owner.graveyard.push(trap);
  for (let i = 0; i < 2; i += 1) owner.rows[row].push(makeToken(state, trap.trapToken || 'squirrel'));
}

/** Effects a unit triggers when it is placed on the board. */
function runUnitOnPlay(state, side, card, row) {
  const effect = card.onPlay;
  if (effect.type === 'mardroeme') transformBerserkers(state, side, row);
  else if (effect.type === 'scorchRow') scorchEnemy(state, side, effect);
  else if (effect.type === 'musterHand') musterFromHand(state, side, effect.group, row);
}

function runLeader(state, side, effect) {
  const mine = state.sides[side];
  const enemy = OPPONENT[side];
  switch (effect.type) {
    case 'weather':
      applyWeather(state, effect.weather);
      break;
    case 'weatherBest':
      askChoice(state, side, 'weather', mine.deck
        .filter(card => card.type === 'special' && card.special === 'weather')
        .map(card => ({ id: card.uid, card })));
      break;
    case 'double':
      mine.doubled[effect.row] = true;
      break;
    case 'moveAny':
      askMoveAny(state, side, 3);
      break;
    case 'scorchRow':
      scorchEnemy(state, side, effect);
      break;
    case 'reveal': {
      const hand = shuffle(state, [...state.sides[enemy].hand]);
      state.reveals[side] = hand.slice(0, 3);
      break;
    }
    case 'cancelEnemyLeader':
      state.sides[enemy].leaderCancelled = true;
      break;
    case 'takeEnemyGraveyard':
      askChoice(state, side, 'takeGrave', state.sides[enemy].graveyard
        .filter(card => card.type === 'unit' && !card.hero)
        .map(card => ({ id: card.uid, card })));
      break;
    case 'reviveAny':
      state.reviveAny = true;
      break;
    case 'moveAgile': {
      const queue = ROWS.flatMap(row => mine.rows[row]
        .filter(card => card.type === 'unit' && card.agile)
        .map(card => card.uid));
      askAgile(state, side, queue);
      break;
    }
    case 'discardDraw':
      askChoice(state, side, 'discard', mine.hand.map(card => ({ id: card.uid, card })), { remaining: 2 });
      break;
    case 'returnFromGraveyard':
      askChoice(state, side, 'returnGrave', mine.graveyard
        .filter(card => card.type !== 'leader')
        .map(card => ({ id: card.uid, card })));
      break;
    case 'shuffleGraveyards':
      for (const s of SIDES) {
        const pool = state.sides[s];
        pool.deck.push(...pool.graveyard.splice(0));
        shuffle(state, pool.deck);
      }
      break;
    default:
      break;
  }
}

function scorchEnemy(state, side, { target, cond, threshold = 10 }) {
  const enemy = OPPONENT[side];
  const condTotal = rowValuesFor(state, enemy, cond).reduce((a, b) => a + b, 0);
  if (condTotal < threshold) return;
  const values = rowValuesFor(state, enemy, target);
  const cards = state.sides[enemy].rows[target];
  const candidates = cards.map((card, index) => ({ card, value: values[index] }))
    .filter(entry => entry.card.type === 'unit' && !entry.card.hero);
  if (candidates.length === 0) return;
  const max = Math.max(...candidates.map(entry => entry.value));
  for (const entry of candidates.filter(item => item.value === max)) removeFromBoard(state, enemy, target, entry.card.uid);
}

/** Destroys the strongest non-hero units on the whole board (both sides). */
function scorchAll(state) {
  const units = boardValues(state).filter(entry => entry.card.type === 'unit' && !entry.card.hero);
  if (units.length === 0) return;
  const max = Math.max(...units.map(entry => entry.value));
  const victims = units.filter(entry => entry.value === max);
  for (const { side, row, card } of victims) removeFromBoard(state, side, row, card.uid);
}

function removeFromBoard(state, side, row, uid) {
  const cards = state.sides[side].rows[row];
  const index = cards.findIndex(card => card.uid === uid);
  if (index < 0) return;
  const [card] = cards.splice(index, 1);
  state.sides[side].graveyard.push(card);
  if (card.onDestroy?.type === 'summon') state.sides[side].rows[row].push(makeToken(state, card.onDestroy.token));
}

/** Mardroeme: every berserker in the row becomes its transformed form (same uid). */
function transformBerserkers(state, side, row) {
  state.sides[side].rows[row] = state.sides[side].rows[row].map(card => (card.transformsTo && !card.hero
    ? { ...TOKENS[card.transformsTo], uid: card.uid }
    : card));
}

/** Keris: summons every card of the group from the deck and from the hand into the row. */
function musterFromHand(state, side, group, row) {
  const mine = state.sides[side];
  for (const pool of [mine.deck, mine.hand]) {
    for (let i = pool.length - 1; i >= 0; i -= 1) {
      const other = pool[i];
      if (other.type === 'unit' && other.bond === group) {
        pool.splice(i, 1);
        mine.rows[other.rows.includes(row) ? row : other.rows[0]].push(other);
      }
    }
  }
}

function musterInto(state, side, card, row) {
  const deck = state.sides[side].deck;
  for (let i = deck.length - 1; i >= 0; i -= 1) {
    const other = deck[i];
    if (other.type === 'unit' && other.muster === card.muster) {
      deck.splice(i, 1);
      state.sides[side].rows[other.rows.includes(row) ? row : other.rows[0]].push(other);
    }
  }
}

/** A side without any legal play is passed automatically. */
function hasPlay(state, side) {
  const copy = { ...state, turn: side, passed: { ...state.passed, [side]: false }, phase: 'playing' };
  return legalPlays(copy, side).length > 0;
}

/**
 * Settles the state after an action: auto-passes sides with no plays, ends the round when
 * both passed, otherwise hands the turn to the side that has not passed. `justActed` is the
 * side that just acted, or null when a round starts.
 */
function advance(state, justActed) {
  for (const s of SIDES) {
    if (!state.passed[s] && !hasPlay(state, s)) state.passed[s] = true;
  }
  if (state.passed.player && state.passed.ai) {
    endRound(state);
    return;
  }
  let next = justActed ? OPPONENT[justActed] : state.turn;
  if (state.passed[next]) next = OPPONENT[next];
  state.turn = next;
}

function reviveRandom(state, side, count) {
  const mine = state.sides[side];
  for (let i = 0; i < count; i += 1) {
    const pool = mine.graveyard.filter(card => card.type === 'unit' && !card.hero && !card.spy);
    if (pool.length === 0) return;
    const card = pool[Math.floor(random(state) * pool.length)];
    takeFrom(mine.graveyard, card.uid);
    mine.rows[card.rows[0]].push(card);
  }
}

function endRound(state) {
  const totals = scores(state);
  let winner = 'draw';
  if (totals.player > totals.ai) winner = 'player';
  else if (totals.ai > totals.player) winner = 'ai';
  // A faction that wins ties (Nilfgaard) takes the round when it is drawn, if only one side has it.
  const tieSides = SIDES.filter(side => state.tieWins[side]);
  if (winner === 'draw' && tieSides.length === 1) winner = tieSides[0];

  // Every card on the board goes to the graveyard, heroes included. Weather and leader doubles end with the round.
  // Monsters keep one random non-hero unit on the board.
  for (const side of SIDES) {
    let kept = null;
    // Monsters keep a random non-hero unit on the board.
    if (state.sides[side].faction === 'monsters') {
      const units = ROWS.flatMap(row => state.sides[side].rows[row].filter(card => card.type === 'unit' && !card.hero).map(card => ({ row, card })));
      if (units.length > 0) kept = units[Math.floor(random(state) * units.length)];
    }
    for (const row of ROWS) {
      // An ambush that was never sprung goes back to the graveyard of whoever laid it.
      const trap = state.sides[side].traps?.[row];
      if (trap) { state.sides[OPPONENT[side]].graveyard.push(trap); state.sides[side].traps[row] = null; }
      for (const card of state.sides[side].rows[row]) if (card !== kept?.card) state.sides[side].graveyard.push(card);
      state.sides[side].rows[row] = kept && kept.row === row ? [kept.card] : [];
    }
    state.sides[side].doubled = noDoubles();
    state.sides[side].mods = noMods();
  }
  state.weather = noWeather();
  state.reveals = { player: [], ai: [] };

  if (winner === 'draw') {
    state.wins.player += 1;
    state.wins.ai += 1;
  } else {
    state.wins[winner] += 1;
  }
  state.lastRound = { round: state.round, scores: totals, winner };
  state.rounds = [...(state.rounds || []), { ...state.lastRound }];

  const playerDone = state.wins.player >= ROUNDS_TO_WIN;
  const aiDone = state.wins.ai >= ROUNDS_TO_WIN;
  if (playerDone || aiDone) {
    state.phase = 'matchOver';
    state.winner = playerDone && aiDone ? 'draw' : playerDone ? 'player' : 'ai';
    return;
  }

  state.round += 1;
  // The winner starts the next round; after a drawn round the side that did not start this one does.
  state.starter = winner === 'draw' ? OPPONENT[state.starter] : winner;
  state.turn = state.starter;
  state.passed = { player: false, ai: false };
  for (const side of SIDES) {
    // Northern Realms draw a card for winning the round.
    if (winner === side && state.sides[side].faction === 'northern-realms') drawCards(state.sides[side], 1);
    // Wild Hunt draw a card for a lost round.
    if (winner === OPPONENT[side] && state.sides[side].faction === 'wild-hunt') drawCards(state.sides[side], 1);
    // Skellige: two random non-hero units come back from the graveyard at the start of round 3.
    // Under the extended rules Skellige also get one unit back at the start of round 2.
    if (state.sides[side].faction === 'skellige' && (state.round === 3 || (state.round === 2 && state.ruleset === 'extended'))) reviveRandom(state, side, state.round === 3 ? 2 : 1);
    // Sorceresses: a random spell from the graveyard returns to the hand at the start of rounds 2 and 3.
    if (state.sides[side].faction === 'sorceresses') {
      const spells = state.sides[side].graveyard.filter(card => card.spell);
      if (spells.length > 0) state.sides[side].hand.push(takeFrom(state.sides[side].graveyard, spells[Math.floor(random(state) * spells.length)].uid));
    }
    // Witchers: a random hero from the graveyard returns to the hand at the start of round 3.
    if (state.round === 3 && state.sides[side].faction === 'witchers') {
      const heroes = state.sides[side].graveyard.filter(card => card.type === 'unit' && card.hero);
      if (heroes.length > 0) state.sides[side].hand.push(takeFrom(state.sides[side].graveyard, heroes[Math.floor(random(state) * heroes.length)].uid));
    }
  }
  advance(state, null);
}
