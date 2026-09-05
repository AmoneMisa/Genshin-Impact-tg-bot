import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SKILL_ENCHANT_MAX_LEVEL,
  getSkillEnchantLevel,
  getSkillPowerMultiplier,
  getPowerMultiplierAtLevel,
  getSkillCostMultiplier,
  getSkillCooldownMultiplier,
  getEffectiveSkillCost,
  getSkillEnchantCost,
  enchantSkill,
} from '../functions/game/player/skillEnchant.js';

function skill(overrides = {}) {
  return {
    slot: 1,
    name: 'Test skill',
    isDealDamage: true,
    damageModifier: 2,
    cooldown: 20,
    cost: 40,
    costHp: 0,
    enchantLevel: 0,
    ...overrides,
  };
}

function inventory(overrides = {}) {
  return { gold: 1_000_000, crystals: 10_000, ironOre: 10_000, sp: 10_000, ...overrides };
}

test('enchant level is clamped between 0 and the max', () => {
  assert.equal(getSkillEnchantLevel(skill()), 0);
  assert.equal(getSkillEnchantLevel(skill({ enchantLevel: -3 })), 0);
  assert.equal(getSkillEnchantLevel(skill({ enchantLevel: 999 })), SKILL_ENCHANT_MAX_LEVEL);
});

test('power multiplier grows 5% per level, cost/cooldown shrink 2% per level', () => {
  const s = skill({ enchantLevel: 4 });
  assert.equal(getSkillPowerMultiplier(s), 1.2);
  assert.equal(getPowerMultiplierAtLevel(4), 1.2);
  assert.equal(Math.round(getSkillCostMultiplier(s) * 100), 92);
  assert.equal(Math.round(getSkillCooldownMultiplier(s) * 100), 92);
});

test('effective cost never rounds a positive cost down to 0', () => {
  const s = skill({ cost: 5, enchantLevel: SKILL_ENCHANT_MAX_LEVEL }); // -20% cost
  const { cost } = getEffectiveSkillCost(s);
  assert.ok(cost >= 1);
});

test('effective cost respects costHp vs cost independently', () => {
  const s = skill({ cost: 0, costHp: 100, enchantLevel: 5 });
  const { cost, costHp } = getEffectiveSkillCost(s);
  assert.equal(cost, 0);
  assert.equal(costHp, 90); // -10% at level 5
});

test('enchant cost scales with (currentLevel+1) and is null at max level', () => {
  const fresh = getSkillEnchantCost(skill({ enchantLevel: 0 }));
  assert.deepEqual(fresh, { gold: 2000, crystals: 5, ironOre: 15, sp: 20 });

  const later = getSkillEnchantCost(skill({ enchantLevel: 3 }));
  assert.deepEqual(later, { gold: 8000, crystals: 20, ironOre: 60, sp: 80 });

  assert.equal(getSkillEnchantCost(skill({ enchantLevel: SKILL_ENCHANT_MAX_LEVEL })), null);
});

test('enchantSkill deducts every resource and bumps the level by exactly one', () => {
  const s = skill({ enchantLevel: 0 });
  const inv = inventory();
  const result = enchantSkill(s, inv);

  assert.equal(result.ok, true);
  assert.equal(result.level, 1);
  assert.equal(s.enchantLevel, 1);
  assert.equal(inv.gold, 1_000_000 - 2000);
  assert.equal(inv.crystals, 10_000 - 5);
  assert.equal(inv.ironOre, 10_000 - 15);
  assert.equal(inv.sp, 10_000 - 20);
});

test('enchantSkill rejects insufficient resources without mutating anything, reason-by-reason', () => {
  const s = skill();

  const noGold = enchantSkill(s, inventory({ gold: 0 }));
  assert.equal(noGold.ok, false);
  assert.equal(noGold.reason, 'not_enough_gold');
  assert.equal(s.enchantLevel, 0);

  const noCrystals = enchantSkill(s, inventory({ crystals: 0 }));
  assert.equal(noCrystals.reason, 'not_enough_crystals');

  const noIronOre = enchantSkill(s, inventory({ ironOre: 0 }));
  assert.equal(noIronOre.reason, 'not_enough_iron_ore');

  const noSp = enchantSkill(s, inventory({ sp: 0 }));
  assert.equal(noSp.reason, 'not_enough_sp');

  assert.equal(s.enchantLevel, 0);
});

test('enchantSkill refuses to go past the max level', () => {
  const s = skill({ enchantLevel: SKILL_ENCHANT_MAX_LEVEL });
  const inv = inventory();
  const result = enchantSkill(s, inv);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'max_level');
  assert.deepEqual(inv, inventory()); // untouched
});
