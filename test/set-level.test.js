import test from 'node:test';
import assert from 'node:assert/strict';
import setLevel from '../functions/game/player/setLevel.js';
import levelsTemplate from '../template/levelsTemplate.js';

function session(overrides = {}) {
  return {
    game: {
      stats: { lvl: 1, currentExp: 0, needExp: levelsTemplate[0].needExp },
      inventory: { gold: 0, crystals: 0, ironOre: 0, sp: 0 },
      // no gameClass -> updatePlayerStats() is skipped, keeping this a pure stat-math test
      ...overrides.game,
    },
    ...overrides,
  };
}

test('gaining a level awards skill points and consumes the needed exp', () => {
  const s = session();
  s.game.stats.currentExp = levelsTemplate[0].needExp; // exactly enough for level 1 -> 2

  setLevel(s);

  assert.equal(s.game.stats.lvl, 2);
  assert.equal(s.game.stats.currentExp, 0);
  assert.equal(s.game.inventory.sp, 20);
});

test('not enough exp yet: no level, no SP, needExp is refreshed', () => {
  const s = session();
  s.game.stats.currentExp = 10;

  setLevel(s);

  assert.equal(s.game.stats.lvl, 1);
  assert.equal(s.game.inventory.sp, 0);
  assert.equal(s.game.stats.needExp, levelsTemplate[0].needExp - 10);
});

test('SP accumulates on top of whatever the player already has', () => {
  const s = session();
  s.game.inventory.sp = 500;
  s.game.stats.currentExp = levelsTemplate[0].needExp;

  setLevel(s);

  assert.equal(s.game.inventory.sp, 520);
});

import { spForLevelUp } from '../functions/game/player/setLevel.js';
import { getSkillEnchantCost, SKILL_ENCHANT_MAX_LEVEL } from '../functions/game/player/skillEnchant.js';
import classSkills from '../template/classSkillsTemplate.js';

test('level-up SP grows with the level and keeps the old 20 at level 1', () => {
  assert.equal(spForLevelUp(1), 20);
  assert.ok(spForLevelUp(50) > spForLevelUp(10));
  let total = 0;
  for (let lvl = 1; lvl < 99; lvl++) total += spForLevelUp(lvl);
  assert.ok(total > 8_000 && total < 11_000, `total ${total}`);
});

test('the skill upgrade economy is reachable: levelling pays for the build you actually play', () => {
  const spToMax = skill => {
    let sp = 0;
    for (let level = 0; level < SKILL_ENCHANT_MAX_LEVEL; level++) sp += getSkillEnchantCost({ ...skill, enchantLevel: level }).sp;
    return sp;
  };
  let levelIncome = 0;
  for (let lvl = 1; lvl < 40; lvl++) levelIncome += spForLevelUp(lvl);
  // By level 40 the levels alone pay for every base skill of a class...
  const baseSkills = classSkills.warrior.filter(skill => skill.slot > 0);
  assert.ok(baseSkills.reduce((sum, skill) => sum + spToMax(skill), 0) < levelIncome * 1.3);
  // ...and the whole 3rd-class kit stays a long-term goal, not a free gift.
  const full = classSkills.archmage.filter(skill => skill.slot > 0).reduce((sum, skill) => sum + spToMax(skill), 0);
  let allLevels = 0;
  for (let lvl = 1; lvl < 99; lvl++) allLevels += spForLevelUp(lvl);
  assert.ok(full > allLevels * 0.8, `${full} vs ${allLevels}`);
});
