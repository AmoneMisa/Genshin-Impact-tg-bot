import test from 'node:test';
import assert from 'node:assert/strict';
import equipmentTemplate from '../template/equipmentTemplate.js';
import gradeScale, { REFERENCE_LEVEL, SCALED_STATS, STRENGTH, gradeLevel } from '../functions/game/equipment/gradeScale.js';
import getEquipStatByName from '../functions/game/player/getters/getEquipStatByName.js';
import scaleClassStats from '../functions/game/player/scaleClassStats.js';
import classStats from '../template/classStatsTemplate.js';

const grades = equipmentTemplate.grades.map(grade => grade.name);

test('flat gear stats grow with grade, the reference level is untouched, the lowest grade is weaker', () => {
  for (const stat of SCALED_STATS) {
    let previous = 0;
    for (const grade of grades) {
      const scale = gradeScale(stat, grade);
      assert.ok(scale > previous, `${stat} ${grade}`);
      previous = scale;
    }
  }
  assert.ok(Math.abs(gradeScale('attack', 'D') - 1) < 0.06, 'D-grade is the reference grade');
  assert.ok(gradeScale('attack', 'noGrade') < 0.5);
  assert.equal(gradeScale('criticalChance', 'S84'), 1, 'only flat attack/defence/hp/cp/mp scale');
  assert.equal(gradeScale('attack', undefined), 1, 'items without a grade keep their values');
  assert.equal(gradeLevel('D'), 29.5);
  assert.equal(REFERENCE_LEVEL, 30);
});

test('a flat piece stays a similar share of the character at every grade (it was 40% -> 0.1%)', () => {
  const mage = classStats.find(item => item.name === 'mage');
  const share = grade => 40 * gradeScale('attack', grade) / scaleClassStats(mage, Math.round(gradeLevel(grade))).attack;
  const shares = ['D', 'C', 'B', 'A', 'S', 'S80', 'S84'].map(share);
  assert.ok(Math.max(...shares) / Math.min(...shares) < 12, `shares ${shares.map(value => value.toFixed(2))}`);
  // Without the scaling the same piece would shrink by three orders of magnitude.
  const unscaled = 40 / scaleClassStats(mage, 91).attack;
  assert.ok(unscaled < 0.002 && STRENGTH > 0.5);
});

test('equipped flat stats are scaled by the item grade; multiplicative stats are not', () => {
  const slot = (grade, characteristics) => ({ kind: 'ring', slots: ['leftRing'], grade, characteristics });
  const flat = grade => getEquipStatByName({ game: { equipmentStats: { leftRing: slot(grade, { attack: 40, attackMul: 1.05 }) } } }, 'attack');
  assert.equal(flat(undefined), 40);
  assert.ok(Math.abs(flat('S') - 40 * gradeScale('attack', 'S')) < 1e-9);
  assert.ok(flat('S') > 40 * 20);
  assert.equal(getEquipStatByName({ game: { equipmentStats: { leftRing: slot('S84', { attackMul: 1.05 }) } } }, 'attackMul', true), 1.05);
});

import potionRestore, { POTION_SHARE, potionShare } from '../functions/game/player/potionRestore.js';
import { useInventoryPotion } from '../miniapp/inventory.js';
import potionsTemplate from '../template/potionsInInventoryTemplate.js';

test('potions restore the larger of their flat power and a share of the maximum', () => {
  const medium = potionsTemplate.find(item => item.type === 'hp' && item.size === 'medium');
  assert.equal(potionRestore(medium, 10_000), 8000, 'a level-5 character still gets the flat 8000');
  assert.equal(potionRestore(medium, 250_000), 55_000, 'a level-60 character gets 22%');
  const elixir = potionsTemplate.find(item => item.bottleType === 'elixir');
  assert.equal(potionRestore(elixir, 200_000), 90_000);
  assert.equal(potionShare(elixir), 0);
  assert.ok(POTION_SHARE.hp.medium > POTION_SHARE.hp.small && POTION_SHARE.hp.small > POTION_SHARE.hp.little);
});

test('using a potion in the Mini App heals by the scaled amount and never past the maximum', () => {
  const session = {
    game: {
      stats: { lvl: 60 },
      gameClass: { stats: { name: 'warrior', maxHp: 250_000, hp: 100_000, maxMp: 20_000, mp: 1_000 }, skills: [] },
      inventory: { potions: { items: potionsTemplate.map(item => ({ ...item, count: 2 })) } },
      equipmentStats: {}, effects: [],
    },
  };
  const hpIndex = potionsTemplate.findIndex(item => item.type === 'hp' && item.size === 'medium');
  const result = useInventoryPotion(session, hpIndex);
  assert.equal(result.ok, true);
  assert.equal(result.restored, 55_000);
  assert.equal(result.potion.share, 22);
  const mpIndex = potionsTemplate.findIndex(item => item.type === 'mp' && item.size === 'small');
  assert.equal(useInventoryPotion(session, mpIndex).restored, 2_000);
});
