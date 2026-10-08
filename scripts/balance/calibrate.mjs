// Calibrates the six base classes against each other in the arena auto-fight
// (functions/game/arena/playerDamagePlayer.js) and prints stat values that put every
// class near a 50% win rate.
//
//   node scripts/balance/calibrate.mjs            # search, then print the result
//   node scripts/balance/calibrate.mjs --check    # only report the current win rates
//
// The search nudges attack / defence / max hp of each base class (coordinate descent)
// and minimises the squared distance of each class's average (smoothed) win rate from 50%,
// over both attack orders, all opponents and several levels. Every match-up uses its own fixed random seed, so a
// change in stats is compared on identical dice instead of on noise.
import clanDuel from '../../functions/game/clans/clanDuel.js';
import stats from '../../template/classStatsTemplate.js';
import classSkills from '../../template/classSkillsTemplate.js';
import changePlayerClass from '../../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../../functions/game/player/updatePlayerStats.js';

const BASES = process.env.CLASSES ? process.env.CLASSES.split(',') : ['warrior', 'mage', 'priest', 'archer', 'rogue', 'berserk'];
const LEVELS = process.env.LEVELS ? process.env.LEVELS.split(",").map(Number) : [15, 20, 30, 40, 50, 60, 75, 90];
const RUNS = Number(process.env.RUNS) || 12;
const by = name => stats.find(item => item.name === name);

function player(className, lvl) {
  const session = {
    userId: 1, userChatData: { user: { id: 1 } },
    game: { stats: { lvl }, inventory: { gold: 0, arena: { items: [{ tokens: 0 }, { pvpSign: null }] } }, gameClass: { stats: { name: 'noClass' } }, effects: [], equipmentStats: {} },
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

// A duel's margin (pool% the attacker keeps minus pool% the defender keeps) becomes a smooth
// win probability, so the search sees a gradient where a hard win/loss would be flat.
const SIGMA = Number(process.env.SIGMA) || 0.5;
const smoothWin = margin => 1 / (1 + Math.exp(-margin / SIGMA));

/** One directed pairing over RUNS seeded duels: mean margin, hard win rate, smooth win rate. */
function directed(a, b, lvl) {
  let margin = 0;
  let wins = 0;
  let smooth = 0;
  for (let i = 0; i < RUNS; i++) {
    Math.random = seeded(hash(`${process.env.SALT || ""}${lvl}|${a}|${b}|${i}`));
    const { result, attackerPercent, defenderPercent } = clanDuel(player(a, lvl), player(b, lvl));
    const m = attackerPercent - defenderPercent;
    margin += m;
    smooth += smoothWin(m);
    wins += result === 0 ? 1 : result === 2 ? 0.5 : 0;
  }
  return { margin: margin / RUNS, wins: wins / RUNS, smooth: smooth / RUNS };
}

export function evaluate() {
  const perClass = Object.fromEntries(BASES.map(name => [name, { score: 0, win: 0, n: 0 }]));
  let loss = 0;
  let pairSquares = 0;
  let pairs = 0;
  for (const lvl of LEVELS) {
    // Every level counts on its own: an archer that wins 98% at level 20 and 19% at level 90
    // must not average out to a "fair" 50%.
    const levelScore = Object.fromEntries(BASES.map(name => [name, 0]));
    for (let i = 0; i < BASES.length; i++) {
      for (let j = i + 1; j < BASES.length; j++) {
        const [a, b] = [BASES[i], BASES[j]];
        const ab = directed(a, b, lvl);
        const ba = directed(b, a, lvl);
        const winA = (ab.wins + (1 - ba.wins)) / 2;           // hard win rate of a over b, order-neutral
        const smoothA = (ab.smooth + (1 - ba.smooth)) / 2;    // the same, smooth
        const score = (smoothA - 0.5) * 100;                  // a's edge over b in % points
        levelScore[a] += score; levelScore[b] -= score;
        perClass[a].win += winA; perClass[b].win += 1 - winA;
        perClass[a].n++; perClass[b].n++;
        pairSquares += score * score; pairs++;
      }
    }
    for (const name of BASES) {
      const mean = levelScore[name] / (BASES.length - 1);
      perClass[name].score += mean / LEVELS.length;
      loss += mean * mean;
    }
  }
  for (const entry of Object.values(perClass)) entry.win = entry.win / entry.n * 100;
  return { loss: loss / LEVELS.length + 0.15 * pairSquares / pairs, perClass };
}

const show = result => Object.entries(result.perClass).map(([name, entry]) => `${name} ${entry.win.toFixed(0)}% (smooth ${(50 + entry.score).toFixed(0)}%)`).join(' | ');

if (process.argv.includes('--check')) {
  const result = evaluate();
  console.log('loss', result.loss.toFixed(2), '\n' + show(result));
  process.exit(0);
}

const FIELDS = (process.env.FIELDS ?? 'attack,defence,maxHp,evasion,accuracy,block,criticalChance').split(',').filter(Boolean);
// SKILLS=1 also tunes the base classes' own skills (slots 1-2: damage / heal / shield power and cooldown).
const TUNE_SKILLS = process.env.SKILLS === '1';
const BOUNDS = {
  attack: [0.6, 1.8], defence: [0.5, 4], maxHp: [0.7, 1.5],
  evasion: [0.6, 1.5], accuracy: [0.7, 1.4], block: [0.5, 2.2], criticalChance: [0.6, 1.5],
};
// WIDE=1 (professions): they start much further from fair, so the search may move further.
if (process.env.WIDE === '1') for (const field of Object.keys(BOUNDS)) BOUNDS[field] = [0.4, 2.5];
const WHOLE = new Set(['maxHp', 'evasion', 'accuracy', 'block']);
const SKILL_FIELDS = ['damageModifier', 'healPower', 'shieldPower', 'cooldown'];
const SKILL_BOUNDS = { damageModifier: [0.7, 1.3], healPower: [0.7, 1.3], shieldPower: [0.7, 1.3], cooldown: [0.7, 1.4] };

// A knob is {label, get, set, lo, hi}: one number the search may move.
const knobs = [];
for (const name of BASES) {
  for (const field of FIELDS) {
    const start = by(name)[field];
    knobs.push({
      label: `${name}.${field}`, group: 'stats', class: name, field,
      get: () => by(name)[field],
      set: value => {
        by(name)[field] = WHOLE.has(field) ? Math.round(value) : Math.round(value * 100) / 100;
        if (field === 'maxHp') by(name).hp = by(name).maxHp;
      },
      lo: start * BOUNDS[field][0], hi: start * BOUNDS[field][1],
    });
  }
  if (TUNE_SKILLS) {
    for (const skill of classSkills[name].filter(item => item.slot > 0)) {
      for (const field of SKILL_FIELDS) {
        if (!(skill[field] > 0)) continue;
        const start = skill[field];
        knobs.push({
          label: `${name}.skill${skill.slot}.${field}`, group: 'skills', class: name, field, skill,
          get: () => skill[field],
          set: value => { skill[field] = field === 'cooldown' ? Math.round(value) : Math.round(value * 100) / 100; },
          lo: start * SKILL_BOUNDS[field][0], hi: start * SKILL_BOUNDS[field][1],
        });
      }
    }
  }
}

for (const name of BASES) console.log('START', name, JSON.stringify(Object.fromEntries(['attack', 'defence', 'maxHp', 'evasion', 'accuracy', 'block', 'criticalChance'].map(field => [field, by(name)[field]]))));
let best = evaluate();
console.log('start loss', best.loss.toFixed(2), '\n' + show(best));
for (const step of [0.18, 0.1, 0.05, 0.025]) {
  let improved = true;
  let rounds = 0;
  while (improved && rounds++ < 3) {
    improved = false;
    for (const knob of knobs) {
      const base = knob.get();
      for (const factor of [1 + step, 1 - step]) {
        const value = Math.min(knob.hi, Math.max(knob.lo, base * factor));
        knob.set(value);
        if (knob.get() === base) continue;
        const trial = evaluate();
        if (trial.loss < best.loss - 1e-6) {
          best = trial; improved = true;
          console.log(`step ${step} ${knob.label} ${base} -> ${knob.get()}  loss ${best.loss.toFixed(2)}`);
          break;
        }
        knob.set(base);
      }
    }
  }
  console.log('after step', step, show(best));
}

console.log('\nFINAL stats:');
for (const name of BASES) console.log(name, JSON.stringify(Object.fromEntries(['attack', 'defence', 'maxHp', 'evasion', 'accuracy', 'block', 'criticalChance'].map(field => [field, by(name)[field]]))));
if (TUNE_SKILLS) {
  console.log('FINAL skills:');
  for (const name of BASES) {
    for (const skill of classSkills[name].filter(item => item.slot > 0)) {
      console.log(`skill ${name} ${skill.slot}`, JSON.stringify(Object.fromEntries(SKILL_FIELDS.filter(field => skill[field] > 0).map(field => [field, skill[field]]))));
    }
  }
}
console.log(show(best));
