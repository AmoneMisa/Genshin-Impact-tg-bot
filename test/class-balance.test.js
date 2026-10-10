import test from 'node:test';
import assert from 'node:assert/strict';
import classStats from '../template/classStatsTemplate.js';
import classSkills from '../template/classSkillsTemplate.js';
import bosses from '../template/bossTemplate.js';
import scaleClassStats from '../functions/game/player/scaleClassStats.js';
import classPower from '../functions/game/player/classPower.js';
import damageMitigation from '../functions/game/player/damageMitigation.js';
import { TIER_POWER_STEP } from '../template/classTree.js';

const LEVELS = [20, 30, 40, 60, 90];
const power = (item, level) => classPower(scaleClassStats(item, level), level);
const byName = name => classStats.find(item => item.name === name);
const near = (value, target, tolerance) => Math.abs(value / target - 1) <= tolerance;

// The tree is first solved to ~+12% power per tier from the stats alone (classTree.js), then each
// profession is nudged by the arena round robin (TUNE in classTree.js), because stats cannot see
// what a skill kit is worth. So the stat power of a class may differ from the tier target in either
// direction; the bands below only catch a runaway, and the duel test at the bottom is the real check.

// Classes that share a family, an archetype (`like`) and a tier have the same numbers, so these tests look at one
// representative of each shape.
const shapes = tier => {
  const seen = new Map();
  for (const item of classStats.filter(entry => entry.tier === tier && entry.like)) if (!seen.has(`${item.family}/${item.like}`)) seen.set(`${item.family}/${item.like}`, item);
  return [...seen.values()];
};
const real = classStats.filter(item => !item.legacy && item.name !== 'noClass');

test('classes of one family, shape and tier are identical in stats', () => {
  for (const tier of [2, 3, 4]) {
    for (const rep of shapes(tier)) {
      for (const item of classStats.filter(entry => entry.tier === tier && entry.family === rep.family && entry.like === rep.like)) {
        for (const key of ['attack', 'defence', 'maxHp', 'maxMp', 'criticalChance', 'speed', 'evasion', 'accuracy', 'block']) assert.equal(item[key], rep[key], `${item.name}.${key}`);
      }
    }
  }
});

// The step a profession takes: the same shape one tier lower (the family's block for the 1st profession).
const stepBelow = item => (item.tier === 2 ? byName(item.family)
  : classStats.find(entry => entry.tier === item.tier - 1 && entry.family === item.family && entry.like === item.like)
  // the shape first appears at this tier (a Paladin is a "warden" shape, the 1st profession is a "crusader" one)
  || classStats.find(entry => entry.tier === item.tier - 1 && entry.family === item.family));

test('every promotion stays a sane multiple of the same shape one tier lower at every level', () => {
  for (const item of real.filter(entry => entry.tier > 1)) {
    const from = stepBelow(item);
    assert.ok(from, item.name);
    for (const level of LEVELS) {
      const ratio = power(item, level) / power(from, level);
      assert.ok(ratio > 0.45 && ratio < 1.6, `${item.name} lvl ${level}: ${ratio.toFixed(3)}`);
    }
  }
});

test('professions of one tier stay within a band of each other in stat power', () => {
  for (const tier of [2, 3, 4]) {
    const list = shapes(tier);
    for (const level of [20, 40, 60, 90]) {
      const powers = list.map(item => power(item, level));
      assert.ok(Math.max(...powers) / Math.min(...powers) < 3, `tier ${tier} lvl ${level}: ${(Math.max(...powers) / Math.min(...powers)).toFixed(2)}`);
    }
  }
});

test('each step up the tree is real progress by stats alone, and branches really differ', () => {
  for (const item of real.filter(entry => entry.tier === 4)) {
    const ratio = power(item, 80) / power(byName(item.family), 80);
    assert.ok(ratio > 0.5 && ratio < 2.6, `${item.name}: ${ratio.toFixed(2)}`);
  }
  // A damage branch and a tank branch of the same start class still split attack and health differently.
  const knight = byName('humanKnight');
  const paladin = byName('paladin');
  assert.ok(byName('darkAvenger').attack > paladin.attack && byName('darkAvenger').defence < paladin.defence);
  assert.ok(paladin.incomingDamageModifier < byName('darkAvenger').incomingDamageModifier);
  assert.ok(byName('assassin').attack > byName('elvenScout').attack && byName('elvenScout').evasion > byName('assassin').evasion);
  assert.ok(knight.tier === 2 && paladin.tier === 3 && byName('phoenixKnight').tier === 4);
});

test('the six family blocks sit inside the range of each other', () => {
  for (const level of [30, 60]) {
    const old = ['warrior', 'mage', 'priest', 'archer'].map(name => power(byName(name), level));
    for (const name of ['rogue', 'berserk']) {
      const value = power(byName(name), level);
      assert.ok(value >= Math.min(...old) * 0.85 && value <= Math.max(...old) * 1.15, `${name} lvl ${level}`);
    }
  }
});

test('defence mitigation is bounded between nothing and half', () => {
  assert.equal(damageMitigation(0, 30), 1);
  assert.ok(damageMitigation(1e9, 30) > 0.5 && damageMitigation(1e9, 30) < 0.5001);
  assert.ok(damageMitigation(50, 30) < damageMitigation(10, 30));
});

// ---- skills: a power budget so the new ones cannot out-scale their cooldown ----

function skillValue(skill) {
  if (skill.isDealDamage) {
    const execute = skill.executeBelow ? 0.35 * skill.executeBonus : 0;
    return skill.damageModifier * (skill.hits || 1) * (1 + execute) * (1 + (skill.critChanceBonus || 0) / 200);
  }
  if (skill.isHeal) return skill.healPower * 7;
  if (skill.isShield) return skill.shieldPower * 6 + (skill.restoreMp || 0) * 2;
  let value = 0;
  for (const buff of skill.buffs || []) {
    value += { damage: buff.amount / 25, critChance: buff.amount / 40, critDamage: buff.amount / 30, guard: buff.amount / 20, taunt: 1, evade: buff.amount / 25, haste: buff.amount / 20 }[buff.kind] * (buff.charges ? Math.min(buff.charges, 5) / 2.5 : 1.2);
  }
  if (skill.debuff) value += { armorBreak: skill.debuff.amount / 15, weaken: skill.debuff.amount / 12, stun: skill.debuff.seconds * 0.8 }[skill.debuff.kind];
  if (skill.restoreMp) value += skill.restoreMp * 6;
  if (skill.shieldPower) value += skill.shieldPower * 6;
  return value;
}

test('a skill\'s strength is matched by its cooldown (value per second stays bounded)', () => {
  const seen = new Set();
  for (const skills of Object.values(classSkills)) {
    for (const skill of skills) {
      if (skill.slot === 0 || seen.has(skill.name)) continue;
      seen.add(skill.name);
      const value = skillValue(skill);
      const perSecond = value / (skill.cooldown + 4);
      assert.ok(perSecond <= 0.3, `${skill.name}: ${value.toFixed(1)} value per ${skill.cooldown}s = ${perSecond.toFixed(3)}/s`);
    }
  }
});

test('higher tier skills are stronger than the tier below on average', () => {
  const average = tier => {
    const picked = [...new Map(Object.values(classSkills).flat().filter(skill => skill.tier === tier && skill.isDealDamage).map(skill => [skill.name, skill])).values()];
    return picked.reduce((sum, skill) => sum + skillValue(skill), 0) / picked.length;
  };
  assert.ok(average(3) > average(2) * 1.4, `${average(2)} -> ${average(3)}`);
});

test('boss effective health (hp multiplier x defence) is flat inside a tier', () => {
  const targets = { 1: 13, 2: 19.5, 3: 28.6 };
  for (const boss of bosses) {
    const effective = boss.combat.hpMul * boss.stats.defence;
    if (boss.epic) {
      // epic raid bosses are several times tougher than the toughest ordinary tier
      assert.ok(effective > targets[3] * 2 && effective < targets[3] * 9, `${boss.name}: ${effective.toFixed(1)}`);
      continue;
    }
    assert.ok(near(effective, targets[boss.tier], 0.05), `${boss.name}: ${effective.toFixed(1)}`);
  }
});

// ---- PvP vs PvE: the tree is balanced on the blend, so check both halves stay sane ----

import { pvpPower, pvePower, hitChance } from '../functions/game/player/classPower.js';

test('PvP: no base class is left behind - the archer used to be 5-25x weaker (defence 0 never grew)', () => {
  for (const level of [20, 40, 60, 90]) {
    const warrior = pvpPower(scaleClassStats(byName('warrior'), level), level);
    for (const name of ['warrior', 'mage', 'priest', 'archer', 'rogue', 'berserk']) {
      const ratio = pvpPower(scaleClassStats(byName(name), level), level) / warrior;
      assert.ok(ratio > 0.45 && ratio < 1.1, `${name} lvl ${level}: ${ratio.toFixed(2)}`);
    }
  }
  assert.ok(byName('archer').defence > 0);
});

test('every profession stays within a sane band of its parent in both PvE and PvP stat power', () => {
  for (const item of real.filter(entry => entry.tier > 1)) {
    const parent = stepBelow(item);
    for (const level of [20, 60, 90]) {
      const pvp = pvpPower(scaleClassStats(item, level), level) / pvpPower(scaleClassStats(parent, level), level);
      const pve = pvePower(scaleClassStats(item, level), level) / pvePower(scaleClassStats(parent, level), level);
      assert.ok(pvp > 0.4 && pvp < 1.6, `${item.name} PvP lvl ${level}: ${pvp.toFixed(2)}`);
      assert.ok(pve > 0.4 && pve < 1.6, `${item.name} PvE lvl ${level}: ${pve.toFixed(2)}`);
    }
  }
});

test('evasion is bounded by the hit table: past ~140 it buys nothing, so no class goes there', () => {
  assert.equal(hitChance(60, 139), 0.275);
  assert.equal(hitChance(115, 140), 0.275);
  assert.equal(hitChance(115, 20), 0.98);
  assert.ok(classStats.every(item => item.evasion <= 140), 'evasion is capped at 140');
});


// ---- the real check: the arena auto-fight, every tier ----

import clanDuel from '../functions/game/clans/clanDuel.js';
import withSeed from './helpers/seededRandom.js';
import changePlayerClass from '../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../functions/game/player/updatePlayerStats.js';

function duelPlayer(className, lvl) {
  const session = {
    userId: 1, userChatData: { user: { id: 1 } },
    game: { stats: { lvl }, inventory: { gold: 0, arena: { items: [{ tokens: 0 }, { pvpSign: null }] } }, gameClass: { stats: { name: 'noClass' } }, effects: [], equipmentStats: {} },
  };
  changePlayerClass(session, className);
  updatePlayerStats(session);
  return session;
}

function winRates(names, lvl, runs = 8) {
  return withSeed(2024 + lvl, () => {
    const wins = Object.fromEntries(names.map(name => [name, 0]));
    for (const a of names) {
      for (const b of names) {
        if (a === b) continue;
        for (let i = 0; i < runs; i++) {
          const { result } = clanDuel(duelPlayer(a, lvl), duelPlayer(b, lvl));
          wins[a] += result === 0 ? 1 : result === 2 ? 0.5 : 0;
          wins[b] += result === 1 ? 1 : result === 2 ? 0.5 : 0;
        }
      }
    }
    return Object.fromEntries(names.map(name => [name, wins[name] / (2 * runs * (names.length - 1)) * 100]));
  });
}

test('arena auto-fight: inside every tier each shape of class wins 30-70% of its duels at every level', () => {
  const tiers = {
    bases: [['warrior', 'mage', 'priest', 'archer', 'rogue', 'berserk'], [20, 60, 90]],
    second: [shapes(2).map(item => item.name), [20, 40, 60]],
    third: [shapes(3).map(item => item.name), [40, 60, 90]],
    fourth: [shapes(4).map(item => item.name), [76, 85]],
  };
  for (const [tier, [names, levels]] of Object.entries(tiers)) {
    for (const level of levels) {
      for (const [name, rate] of Object.entries(winRates(names, level, 6))) {
        assert.ok(rate > 30 && rate < 70, `${tier} ${name} lvl ${level}: ${rate.toFixed(0)}%`);
      }
    }
  }
});

test('arena auto-fight: a higher profession beats a lower tier on average (promotion is real progress)', () => {
  const sample = ['warrior', 'archer', 'humanKnight', 'warder', 'darkAvenger', 'hawkeye', 'hellKnight', 'sagittarius'];
  const rates = winRates(sample, 85, 6);
  const avg = names => names.reduce((sum, name) => sum + rates[name], 0) / names.length;
  assert.ok(avg(['warrior', 'archer']) < avg(['humanKnight', 'warder']), 'tier 2 beats the bases');
  assert.ok(avg(['humanKnight', 'warder']) < avg(['darkAvenger', 'hawkeye']), 'tier 3 beats tier 2');
  assert.ok(avg(['darkAvenger', 'hawkeye']) < avg(['hellKnight', 'sagittarius']), 'tier 4 beats tier 3');
});
