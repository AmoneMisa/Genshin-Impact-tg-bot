// Computer opponent for Gwent, in three strengths. No DOM access.
// - easy:   mostly random legal plays with a few deliberate mistakes. For beginners. Half of its turns it
//           still looks for a sensible special card (decoy, horn, weather, scorch, leader).
// - medium: values every play by the lead it creates plus what the card is worth beyond the board
//           (spy draws, medic revives from the graveyard, decoy re-use, leader effects). Passes when it is
//           ahead, saves cards in a lost early round and uses the faction's rules (ties, passives).
// - hard:   the same knowledge plus a determinized Monte-Carlo search. Every candidate is tried against
//           many random deals of the cards it cannot see (counted from the opponent's faction minus
//           everything already played), with both sides playing a fast heuristic to the end of the round.
import { ROWS, deckFor, expandDeck } from './gwent-decks.js';
import { OPPONENT, legalPlays, playCard, passRound, resolveChoice, aiChoiceId, scores, rowValuesFor } from './gwent-engine.js';

export const AI_LEVELS = Object.freeze(['easy', 'medium', 'hard']);
export const DEFAULT_AI_LEVEL = 'medium';
export const normalizeAiLevel = level => (AI_LEVELS.includes(level) ? level : DEFAULT_AI_LEVEL);

const ME = 'ai';
const FOE = 'player';
const PASS = Object.freeze({ type: 'pass' });

/** Small deterministic generator for the search, so tests can seed it. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rough worth of a card, used to decide what to spend first. */
function worth(card) {
  if (!card) return 4; // the leader card
  if (card.type !== 'unit') return ({ horn: 9, scorch: 7, weather: 5, mardroeme: 4, decoy: 2, ambush: 5, fireball: 6, blessing: 6, curse: 5, teleport: 3, recall: 4 })[card.special] ?? 4;
  return card.strength + (card.hero ? 3 : 0) + (card.bond ? 3 : 0) + (card.muster ? 3 : 0) + (card.medic ? 3 : 0)
    + (card.morale || card.horn ? 3 : 0) + (card.spy ? 2 : 0);
}

const handCard = (state, side, uid) => state.sides[side].hand.find(card => card.uid === uid);
const isLeaderPlay = (state, side, play) => state.sides[side].leader?.uid === play.uid;
const board = (state, side) => ROWS.flatMap(row => state.sides[side].rows[row]);

/** Strength lead of `side`. A faction that wins ties (Nilfgaard) counts half a point for a tied board. */
function lead(state, side) {
  const foe = OPPONENT[side];
  const total = scores(state);
  const tie = state.tieWins[side] && !state.tieWins[foe] ? 0.5 : state.tieWins[foe] && !state.tieWins[side] ? -0.5 : 0;
  return total[side] - total[foe] + tie;
}
const winning = (state, side) => lead(state, side) > 0;

/** The best unit a medic could bring back from this side's graveyard (0 when there is none). */
function bestRevive(state, side) {
  const reviveAny = state.reviveAny;
  return state.sides[side].graveyard.filter(card => card.type === 'unit' && (reviveAny || !card.hero))
    .reduce((best, card) => Math.max(best, card.strength), 0);
}

/** Strength a conditional scorch (a unit's or leader's) would destroy now, 0 when its condition is not met. */
function scorchGain(state, side, { target, cond, threshold = 10 }) {
  const foe = OPPONENT[side];
  const condTotal = rowValuesFor(state, foe, cond).reduce((a, b) => a + b, 0);
  if (condTotal < threshold) return 0;
  const values = rowValuesFor(state, foe, target);
  const victims = state.sides[foe].rows[target].map((card, index) => ({ card, value: values[index] }))
    .filter(entry => entry.card.type === 'unit' && !entry.card.hero);
  if (victims.length === 0) return 0;
  const max = Math.max(...victims.map(entry => entry.value));
  return victims.filter(entry => entry.value === max).reduce((sum, entry) => sum + entry.value, 0);
}

// ---- choices -----------------------------------------------------------------------------------

/** Lead for the side that chose after taking `option` of the pending choice, or null. */
function leadAfterOption(state, option) {
  const side = state.pending.side;
  const result = resolveChoice(state, side, option.id);
  return result.state ? lead(result.state, side) : null;
}

/** Medium and hard pick options by what they do to the board; easy picks at random. */
function chooseOption(state, level, rng) {
  const pending = state.pending;
  const kind = pending.kind;
  if (kind === 'first') return level === 'easy' && rng() < 0.5 ? 'self' : 'enemy'; // moving second gives the last word
  if (kind === 'mulligan') {
    if (level === 'easy') return 'done';
    return aiChoiceId(state);
  }
  if (level === 'easy' && kind !== 'agile') return pending.options[Math.floor(rng() * pending.options.length)].id;
  if (kind === 'revive' || kind === 'agile' || kind === 'weather') {
    let best = null;
    for (const option of pending.options) {
      const value = leadAfterOption(state, option);
      if (value === null) continue;
      const score = value + (option.card ? worth(option.card) * 0.001 : 0);
      if (!best || score > best.score) best = { score, id: option.id };
    }
    if (best) return best.id;
  }
  const cards = pending.options.filter(option => option.card);
  if (cards.length === pending.options.length) {
    const sorted = [...cards].sort((a, b) => (kind === 'discard' ? worth(a.card) - worth(b.card) : worth(b.card) - worth(a.card)));
    return sorted[0].id;
  }
  return aiChoiceId(state);
}

/** Resolves the AI's own pending choices, so a play is judged by what it finally does. */
function settle(state, level, rng) {
  let current = state;
  for (let guard = 0; guard < 8 && current.pending; guard += 1) {
    const result = resolveChoice(current, current.pending.side, chooseOption(current, level, rng));
    if (!result.state) break;
    current = result.state;
  }
  return current;
}

// ---- valuing plays -----------------------------------------------------------------------------

/** What a play is worth beyond the strength it puts on the board. */
function bonusOf(state, side, play) {
  const mine = state.sides[side];
  const foe = state.sides[OPPONENT[side]];
  const card = handCard(state, side, play.uid);
  if (!card) {
    switch (mine.leader.effect.type) {
      case 'takeEnemyGraveyard': return foe.graveyard.some(item => item.type === 'unit' || item.type === 'special') ? 4 : 0;
      case 'returnFromGraveyard': return mine.graveyard.length > 0 ? 4 : 0;
      case 'discardDraw': return mine.deck.length > 0 ? 2 : 0;
      case 'weatherBest': return mine.deck.some(item => item.special === 'weather') ? 3 : 0;
      case 'cancelEnemyLeader': return foe.leader && !foe.leaderUsed && !foe.leaderCancelled ? 3 : 0;
      case 'shuffleGraveyards': return mine.graveyard.length >= 2 && mine.graveyard.length >= foe.graveyard.length ? 2 : 0;
      case 'reveal': return 0.5;
      default: return 0;
    }
  }
  // An ambush costs a card and pays when the opponent plays into the row; likely where units already stand.
  if (card.special === 'ambush') return foe.rows[play.row]?.length ? 3 : 1;
  // A recall puts a unit from the graveyard back into the hand: worth about half its strength.
  if (card.special === 'recall') return Math.min(4, bestRevive(state, side) / 2);
  if (card.spy) return 3 * Math.min(2, mine.deck.length); // cards drawn
  if (card.special === 'decoy' || (card.swap && play.targetUid !== undefined)) {
    const target = ROWS.flatMap(row => mine.rows[row]).find(unit => unit.uid === play.targetUid);
    if (!target) return 0;
    // Take back the opponent's spy that stands on this side: played again it draws two cards. It then
    // strengthens the opponent's board, so its strength is counted against the draw.
    if (target.spy) return 3 * Math.min(2, mine.deck.length) - target.strength;
    // Take back a unit with a conditional scorch to fire it again.
    if (target.onPlay?.type === 'scorchRow') return scorchGain(state, side, target.onPlay);
    // Use a medic again with a good unit waiting in the graveyard.
    return target.medic ? bestRevive(state, side) : 0;
  }
  return 0;
}

/** Every legal play with its settled result and value. */
function evaluate(state, side, plays, level, rng) {
  const before = lead(state, side);
  const list = [];
  for (const play of plays) {
    const result = playCard(state, side, play.uid, { row: play.row, targetUid: play.targetUid });
    if (!result.state) continue;
    const after = settle(result.state, level, rng);
    const card = handCard(state, side, play.uid);
    const gain = lead(after, side) - before;
    const bonus = bonusOf(state, side, play);
    // Scorch and weather also hurt when they miss, so they must earn their card.
    const costly = card && (card.special === 'scorch' || card.special === 'weather');
    list.push({ play, card, after, gain, bonus, value: gain + bonus - (costly ? 1 : 0), cost: worth(card) });
  }
  return list;
}


/** A game for the side is "decisive" when losing this round loses the match. */
const canGiveUp = (state, side) => state.wins[OPPONENT[side]] === 0;

function pickBest(list) {
  return list.reduce((best, entry) => (!best || entry.value > best.value ? entry : best), null);
}
const asAction = entry => ({ type: 'play', ...entry.play });

function easyAction(state, rng) {
  const plays = legalPlays(state, ME);
  if (plays.length === 0) return PASS;
  const ahead = lead(state, ME);
  if (state.passed[FOE] && ahead > 0) return PASS;
  if (ahead >= 25 && rng() < 0.3) return PASS;
  if (!state.passed[FOE] && rng() < 0.1) return PASS; // beginners' mistake: stops too early
  // Every other turn it looks for a special card (decoy, horn, weather, scorch, leader) worth playing.
  if (rng() < 0.5) {
    const specials = evaluate(state, ME, plays.filter(play => isLeaderPlay(state, ME, play) || handCard(state, ME, play.uid)?.type === 'special'), 'easy', rng);
    const best = pickBest(specials);
    if (best && best.value > 0) return asAction(best);
  }
  if (rng() < 0.1) {
    const best = pickBest(evaluate(state, ME, plays, 'easy', rng));
    if (best && best.gain > 0) return asAction(best);
  }
  const usable = plays.filter(play => !isLeaderPlay(state, ME, play) || rng() < 0.2);
  const pool = usable.length ? usable : plays;
  return { type: 'play', ...pool[Math.floor(rng() * pool.length)] };
}

function mediumAction(state, rng, level = 'medium') {
  const plays = legalPlays(state, ME);
  if (plays.length === 0) return PASS;
  const mine = state.sides[ME];
  const foe = state.sides[FOE];
  const list = evaluate(state, ME, plays, level, rng);
  if (list.length === 0) return PASS;
  const stillAhead = entry => winning(entry.after, ME);
  // Cards that are worth playing even when the round is already won: they draw or return cards.
  const free = list.filter(entry => entry.bonus > 0 && entry.value > 0 && stillAhead(entry));

  if (state.passed[FOE]) {
    if (winning(state, ME)) {
      const best = pickBest(free);
      return best ? asAction(best) : PASS;
    }
    const overtaking = list.filter(stillAhead).sort((a, b) => a.cost - b.cost);
    if (overtaking.length) return asAction(overtaking[0]);
    if (canGiveUp(state, ME)) {
      // Nothing to lose by using the leader before giving the round up.
      const leader = list.find(entry => !entry.card && entry.value >= 0);
      return leader ? asAction(leader) : PASS;
    }
    return asAction(pickBest(list));
  }

  const ahead = lead(state, ME);
  // Comfortably ahead with no more cards than the opponent: stop and let them spend theirs.
  if (ahead >= 12 && mine.hand.length <= foe.hand.length + 2) {
    const best = pickBest(free);
    return best ? asAction(best) : PASS;
  }
  // Far behind in an early round: save the cards for the next one. Northern Realms want every round (they draw).
  const giveUpAt = mine.faction === 'northern-realms' ? -25 : -18;
  if (canGiveUp(state, ME) && ahead <= giveUpAt && mine.hand.length < 10) return PASS;

  const best = pickBest(list);
  if (!best || best.value <= 0) {
    const leader = list.find(entry => !entry.card && entry.value >= 0 && !winning(state, ME));
    return leader ? asAction(leader) : PASS;
  }
  if (ahead > 0) {
    // Already ahead: spend the cheapest card that keeps the lead and keep the strong ones. Free plays go first.
    const bestFree = pickBest(free);
    if (bestFree) return asAction(bestFree);
    const keeping = list.filter(stillAhead).sort((a, b) => a.cost - b.cost);
    if (keeping.length) return asAction(keeping[0]);
  }
  return asAction(best);
}

// ---- hard: determinized search -----------------------------------------------------------------

/**
 * Cards the opponent may still hold: its faction's catalogue minus what is on its board or in its
 * graveyard. The AI counts the discard pile instead of reading the real hand and deck.
 */
export function unseenCards(state, side) {
  const faction = state.sides[side].faction;
  const deck = deckFor(state.ruleset, faction);
  if (!deck) return null;
  const remaining = new Map();
  for (const card of expandDeck(deck)) remaining.set(card.id, [...(remaining.get(card.id) || []), card]);
  const seen = [...board(state, side), ...state.sides[side].graveyard];
  for (const card of seen) {
    const left = remaining.get(card.id);
    if (left && left.length) left.pop();
  }
  return [...remaining.values()].flat();
}

/** Replaces everything `me` cannot see by one random possibility. */
function determinize(state, me, rng) {
  const next = structuredClone(state);
  next.rngState = Math.floor(rng() * 2147483645) + 1;
  next.reveals = { player: [], ai: [] };
  const mix = list => {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  };
  mix(next.sides[me].deck);
  // Ambushes the opponent laid in the AI's rows are hidden from it.
  next.sides[me].traps = { close: null, ranged: null, siege: null };
  const foe = next.sides[OPPONENT[me]];
  const handSize = foe.hand.length;
  const deckSize = foe.deck.length;
  const unseen = unseenCards(state, OPPONENT[me]);
  if (!unseen || unseen.length < handSize + deckSize) {
    // Not enough information about the catalogue: fall back to reshuffling the real hidden cards.
    const pool = [...foe.hand, ...foe.deck];
    mix(pool);
    foe.hand = pool.slice(0, handSize);
    foe.deck = pool.slice(handSize);
    return next;
  }
  mix(unseen);
  const fresh = card => ({ ...card, uid: next.nextUid++ });
  foe.hand = unseen.slice(0, handSize).map(fresh);
  foe.deck = unseen.slice(handSize, handSize + deckSize).map(fresh);
  return next;
}

/** Cheapest play that puts `side` ahead after the opponent has passed, or null. */
function cheapestOvertake(state, side, plays) {
  const ordered = [...plays].sort((a, b) => worth(handCard(state, side, a.uid)) - worth(handCard(state, side, b.uid)));
  for (const play of ordered) {
    const result = playCard(state, side, play.uid, { row: play.row, targetUid: play.targetUid });
    if (result.state && winning(result.state, side)) return play;
  }
  return null;
}

/** The fast play policy both sides follow in a search rollout. Returns an action. */
function quickAction(state, side) {
  const foe = OPPONENT[side];
  const mine = state.sides[side];
  // Plays that pick a unit to take back (decoy, swap) are left to the full evaluation, not the fast policy.
  const plays = legalPlays(state, side).filter(play => !isLeaderPlay(state, side, play) && play.targetUid === undefined);
  if (plays.length === 0) return PASS;
  const ahead = lead(state, side);
  if (state.passed[foe]) {
    if (ahead > 0) {
      // A spy is free card advantage when the round is already won.
      if (mine.deck.length > 0) {
        for (const play of plays) {
          if (!handCard(state, side, play.uid)?.spy) continue;
          const result = playCard(state, side, play.uid, { row: play.row });
          if (result.state && winning(result.state, side)) return { type: 'play', ...play };
        }
      }
      return PASS;
    }
    const play = cheapestOvertake(state, side, plays);
    if (play) return { type: 'play', ...play };
    if (canGiveUp(state, side)) return PASS;
  } else if (ahead >= 12 && mine.hand.length <= state.sides[foe].hand.length + 2) {
    return PASS;
  }
  const byWorth = [...plays].sort((a, b) => worth(handCard(state, side, a.uid)) - worth(handCard(state, side, b.uid)));
  const chosen = ahead > 0 ? byWorth[0] : byWorth[byWorth.length - 1];
  // Horns and row buffs go where they help most.
  const card = handCard(state, side, chosen.uid);
  const rowCards = ['horn', 'mardroeme', 'blessing', 'fireball', 'curse'];
  if (rowCards.includes(card?.special)) {
    let bestRow = chosen;
    let bestSum = -1;
    // Buffs go where the own strength is, attacks where the enemy's is.
    const onEnemy = card.special === 'fireball' || card.special === 'curse';
    for (const play of plays.filter(item => item.uid === chosen.uid)) {
      const sum = state.sides[onEnemy ? foe : side].rows[play.row].reduce((total, unit) => total + (unit.type === 'unit' && !unit.hero ? unit.strength : 0), 0);
      if (sum > bestSum) { bestSum = sum; bestRow = play; }
    }
    return { type: 'play', ...bestRow };
  }
  return { type: 'play', ...chosen };
}

function apply(state, side, action) {
  if (action.type === 'pass') return passRound(state, side);
  return playCard(state, side, action.uid, { row: action.row, targetUid: action.targetUid });
}

/** Plays the round out with the fast policy and rates the result for `me` between 0 and 1. */
function rollout(start, me, rounds) {
  const foe = OPPONENT[me];
  let state = start;
  for (let step = 0; step < 120 && state.phase === 'playing' && state.round === rounds; step += 1) {
    if (state.pending) {
      state = resolveChoice(state, state.pending.side, aiChoiceId(state)).state;
      continue;
    }
    const side = state.turn;
    const result = apply(state, side, quickAction(state, side));
    state = result.state || passRound(state, side).state;
  }
  return rate(state, me, foe, rounds);
}

function rate(state, me, foe, rounds) {
  if (state.phase === 'matchOver') return state.winner === me ? 1 : state.winner === foe ? 0 : 0.5;
  if (state.round === rounds) return 0.5 + Math.tanh(lead(state, me) / 30) * 0.2;
  // The round ended: rounds won count most, cards in hand show who can keep fighting. Units that stay
  // on the board (Monsters, Skellige's returned units) count a little.
  const total = scores(state);
  const standing = 0.5 + 0.22 * (state.wins[me] - state.wins[foe]);
  const cards = (state.sides[me].hand.length - state.sides[foe].hand.length) * 0.045;
  const kept = Math.max(-0.05, Math.min(0.05, (total[me] - total[foe]) * 0.012));
  const leader = (state.sides[me].leader && !state.sides[me].leaderUsed ? 0.02 : 0)
    - (state.sides[foe].leader && !state.sides[foe].leaderUsed ? 0.02 : 0);
  return Math.min(0.99, Math.max(0.01, standing + cards + kept + leader));
}

function hardAction(state, rng, budgetMs) {
  const plays = legalPlays(state, ME);
  if (plays.length === 0) return PASS;
  const rounds = state.round;
  // Candidates: pass, plus every play with its choices settled (identical copies in hand are tried once).
  const seen = new Set();
  const unique = plays.filter(play => {
    const card = handCard(state, ME, play.uid);
    const key = `${card?.id ?? 'leader'}|${play.row ?? ''}|${play.targetUid ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const candidates = evaluate(state, ME, unique, 'hard', rng).map(entry => ({
    action: asAction(entry), start: entry.after, prior: entry.value, gain: entry.gain, total: 0, runs: 0,
  }));
  const passed = passRound(state, ME);
  if (passed.state) candidates.push({ action: PASS, start: passed.state, prior: 0, gain: 0, total: 0, runs: 0 });
  // Keep the most promising ones; the search then decides between them.
  candidates.sort((a, b) => b.prior - a.prior);
  candidates.length = Math.min(candidates.length, 18);
  if (candidates.length === 1) return candidates[0].action;

  const deadline = Date.now() + budgetMs;
  for (let iteration = 0; iteration < 40; iteration += 1) {
    const seed = Math.floor(rng() * 4294967296);
    for (const candidate of candidates) {
      if (iteration >= 3 && Date.now() > deadline) break;
      // Every candidate meets the same random deal in an iteration, which removes most of the noise.
      const deal = seededRandom(seed);
      const start = candidate.start.round !== rounds || candidate.start.phase !== 'playing'
        ? candidate.start : determinize(candidate.start, ME, deal);
      candidate.total += rollout(start, ME, rounds);
      candidate.runs += 1;
    }
    if (iteration >= 3 && Date.now() > deadline) break;
  }
  let best = null;
  for (const candidate of candidates) {
    if (candidate.runs === 0) continue;
    const value = candidate.total / candidate.runs + candidate.prior * 0.0005;
    if (!best || value > best.value) best = { value, action: candidate.action };
  }
  return best ? best.action : mediumAction(state, rng, 'hard');
}

const swap = value => (value === 'player' ? 'ai' : value === 'ai' ? 'player' : value);

/** The same match seen from the other side, so one implementation plays either seat. */
function mirror(state) {
  const next = structuredClone(state);
  for (const field of ['sides', 'passed', 'wins', 'tieWins', 'reveals']) next[field] = { player: state[field].ai, ai: state[field].player };
  next.turn = swap(state.turn);
  next.starter = swap(state.starter);
  next.winner = swap(state.winner);
  if (state.pending) next.pending = { ...state.pending, side: swap(state.pending.side) };
  return next;
}

/**
 * The next AI action: `{ type: 'choice', id }`, `{ type: 'play', uid, row?, targetUid? }`,
 * `{ type: 'pass' }`, or null when it is not the AI's move. Options: `level`, `rng`, `budgetMs`,
 * and `side` ('ai' by default; 'player' lets the AI play the human seat, e.g. in simulations).
 */
export function chooseAiAction(state, { level = DEFAULT_AI_LEVEL, rng = Math.random, budgetMs = 450, side = ME } = {}) {
  if (side !== ME) return chooseAiAction(mirror(state), { level, rng, budgetMs });
  const mode = normalizeAiLevel(level);
  if (state.pending?.side === ME) return { type: 'choice', id: chooseOption(state, mode, rng) };
  if (state.pending || state.phase !== 'playing' || state.turn !== ME || state.passed[ME]) return null;
  if (mode === 'easy') return easyAction(state, rng);
  if (mode === 'hard') return hardAction(state, rng, budgetMs);
  return mediumAction(state, rng);
}
