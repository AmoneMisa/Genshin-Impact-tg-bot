// Calibrates one tier of the real class tree in the arena auto-fight: one representative class for every
// archetype (`like`) of the tier, nudging attack / defence / max hp until every archetype wins about half of its
// duels. Prints the factors to multiply into TUNE (template/classTree.js).
//
//   TIER=2 node scripts/balance/calibrate-tree.mjs            # search, print JSON factors
//   TIER=2 node scripts/balance/calibrate-tree.mjs --check    # only report the current win rates
//
// Calibrate the tiers in order (2, 3, 4): a tier is built on the tuned numbers of the one below.
import clanDuel from '../../functions/game/clans/clanDuel.js';
import stats from '../../template/classStatsTemplate.js';
import changePlayerClass from '../../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../../functions/game/player/updatePlayerStats.js';

const TIER = Number(process.env.TIER) || 2;
const LEVELS = process.env.LEVELS ? process.env.LEVELS.split(',').map(Number) : ({2: [20, 30, 40, 60], 3: [40, 50, 60, 75], 4: [76, 80, 85]})[TIER];
const RUNS = Number(process.env.RUNS) || 8;
const FIELDS = (process.env.FIELDS || 'attack,defence,maxHp').split(',');
const by = name => stats.find(item => item.name === name);

const reps = new Map();
for (const item of stats.filter(entry => entry.tier === TIER && entry.like)) if (!reps.has(`${item.family}/${item.like}`)) reps.set(`${item.family}/${item.like}`, item.name);
const KEYS = [...reps.keys()];
const NAMES = KEYS.map(key => reps.get(key));

function player(className, lvl) {
  const session = {
    userId: 1, userChatData: {user: {id: 1}},
    game: {stats: {lvl}, inventory: {gold: 0, arena: {items: [{tokens: 0}, {pvpSign: null}]}}, gameClass: {stats: {name: 'noClass'}}, effects: [], equipmentStats: {}},
  };
  changePlayerClass(session, className);
  updatePlayerStats(session);
  return session;
}

function seeded(seed) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = text => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const SIGMA = 0.5;
const smoothWin = margin => 1 / (1 + Math.exp(-margin / SIGMA));
const realRandom = Math.random;

// A knob moves one class, so only the duels of that class are fought again: the result of a pair is kept while
// the numbers of both classes stay the same.
const memo = new Map();
const signature = name => JSON.stringify(['attack', 'defence', 'maxHp', 'maxMp', 'maxCp', 'evasion', 'accuracy', 'block', 'criticalChance', 'speed'].map(field => by(name)[field]));
function directed(a, b, lvl) {
  const key = `${a}|${b}|${lvl}|${signature(a)}|${signature(b)}`;
  if (memo.has(key)) return memo.get(key);
  const value = fight(a, b, lvl);
  memo.set(key, value);
  return value;
}

function fight(a, b, lvl) {
  let wins = 0, smooth = 0;
  for (let i = 0; i < RUNS; i++) {
    Math.random = seeded(hash(`${lvl}|${a}|${b}|${i}`));
    const {result, attackerPercent, defenderPercent} = clanDuel(player(a, lvl), player(b, lvl));
    smooth += smoothWin(attackerPercent - defenderPercent);
    wins += result === 0 ? 1 : result === 2 ? 0.5 : 0;
  }
  Math.random = realRandom;
  return {wins: wins / RUNS, smooth: smooth / RUNS};
}

function evaluate() {
  const perClass = Object.fromEntries(NAMES.map(name => [name, {score: 0, win: 0, n: 0}]));
  let loss = 0, pairSquares = 0, pairs = 0;
  for (const lvl of LEVELS) {
    const levelScore = Object.fromEntries(NAMES.map(name => [name, 0]));
    for (let i = 0; i < NAMES.length; i++) for (let j = i + 1; j < NAMES.length; j++) {
      const [a, b] = [NAMES[i], NAMES[j]];
      const ab = directed(a, b, lvl), ba = directed(b, a, lvl);
      const winA = (ab.wins + (1 - ba.wins)) / 2, smoothA = (ab.smooth + (1 - ba.smooth)) / 2;
      const score = (smoothA - 0.5) * 100;
      levelScore[a] += score; levelScore[b] -= score;
      perClass[a].win += winA; perClass[b].win += 1 - winA; perClass[a].n++; perClass[b].n++;
      pairSquares += score * score; pairs++;
    }
    for (const name of NAMES) {
      const mean = levelScore[name] / (NAMES.length - 1);
      perClass[name].score += mean / LEVELS.length;
      loss += mean * mean;
    }
  }
  for (const entry of Object.values(perClass)) entry.win = entry.win / entry.n * 100;
  return {loss: loss / LEVELS.length + 0.15 * pairSquares / pairs, perClass};
}
const show = result => Object.entries(result.perClass).map(([name, entry]) => `${name} ${entry.win.toFixed(0)}%`).join(' | ');

if (process.argv.includes('--check')) {
  const result = evaluate();
  console.log('loss', result.loss.toFixed(2), '\n' + show(result));
  process.exit(0);
}

const WHOLE = new Set(['maxHp', 'evasion', 'accuracy', 'block']);
const BOUND = [0.5, 2];
const knobs = [];
for (const key of KEYS) {
  const name = reps.get(key);
  for (const field of FIELDS) {
    const start = by(name)[field];
    knobs.push({key, field, start, get: () => by(name)[field], set: value => {
      by(name)[field] = WHOLE.has(field) ? Math.round(value) : Math.round(value * 1000) / 1000;
      if (field === 'maxHp') by(name).hp = by(name).maxHp;
    }, lo: start * BOUND[0], hi: start * BOUND[1]});
  }
}
let best = evaluate();
console.error('start', best.loss.toFixed(2), show(best));
const STEPS = process.env.STEPS ? process.env.STEPS.split(',').map(Number) : [0.2, 0.1, 0.05];
const ROUNDS = Number(process.env.ROUNDS) || 3;
for (const step of STEPS) {
  let improved = true, rounds = 0;
  while (improved && rounds++ < ROUNDS) {
    improved = false;
    for (const knob of knobs) {
      const base = knob.get();
      for (const factor of [1 + step, 1 - step]) {
        knob.set(Math.min(knob.hi, Math.max(knob.lo, base * factor)));
        if (knob.get() === base) continue;
        const trial = evaluate();
        if (trial.loss < best.loss - 1e-6) { best = trial; improved = true; break; }
        knob.set(base);
      }
    }
  }
  console.error('after step', step, best.loss.toFixed(2), show(best));
}
const factors = {};
for (const knob of knobs) (factors[knob.key] ||= {})[knob.field] = Math.round(knob.get() / knob.start * 1000) / 1000;
console.log(JSON.stringify({tier: TIER, factors, win: Object.fromEntries(Object.entries(best.perClass).map(([name, entry]) => [name, Math.round(entry.win)]))}, null, 1));
