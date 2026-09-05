import test from 'node:test';
import assert from 'node:assert/strict';
import craftItem, { CRAFT_COSTS, getCraftableGrades } from '../functions/game/equipment/craftItem.js';
import upgradeItem, { getItemUpgradeCost, getItemUpgradeLevel, MAX_UPGRADE_LEVEL } from '../functions/game/equipment/upgradeItem.js';

function inventory(overrides = {}) {
  return { gold: 1_000_000, crystals: 10_000, ironOre: 50_000, equipment: { name: 'Экипировка', items: [] }, ...overrides };
}

test('getCraftableGrades only returns grades the player has reached', () => {
  const grades = getCraftableGrades(25);
  const names = grades.map(g => g.name);
  assert.ok(names.includes('noGrade'));
  assert.ok(names.includes('D'));
  assert.ok(!names.includes('C')); // C starts at level 40
});

test('crafting deducts the exact grade cost and adds a real item to inventory', () => {
  const inv = inventory();
  const before = { ...inv };
  const result = craftItem(inv, 'D', 25);

  assert.equal(result.ok, true);
  assert.equal(inv.gold, before.gold - CRAFT_COSTS.D.gold);
  assert.equal(inv.crystals, before.crystals - CRAFT_COSTS.D.crystals);
  assert.equal(inv.ironOre, before.ironOre - CRAFT_COSTS.D.ironOre);
  assert.equal(inv.equipment.items.length, 1);
  assert.equal(inv.equipment.items[0].grade, 'D');
});

test('crafting rejects a grade above the player level without mutating inventory', () => {
  const inv = inventory();
  const before = { ...inv };
  const result = craftItem(inv, 'S', 25); // S needs level 70+

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'level_too_low');
  assert.equal(inv.gold, before.gold);
  assert.equal(inv.equipment.items.length, 0);
});

test('crafting rejects insufficient resources without mutating inventory', () => {
  const inv = inventory({ gold: 0 });
  const result = craftItem(inv, 'noGrade', 5);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'not_enough_resources');
  assert.equal(inv.equipment.items.length, 0);
});

function itemWithStats(overrides = {}) {
  return {
    grade: 'D',
    forgeLevel: 0,
    stats: [
      { name: 'attack', value: 40 },
      { name: 'attackMul', value: 1.08 },
    ],
    ...overrides,
  };
}

test('upgrading scales flat stats multiplicatively and factor stats around their bonus', () => {
  const item = itemWithStats();
  const inv = inventory();
  const result = upgradeItem(item, inv);

  assert.equal(result.ok, true);
  assert.equal(item.forgeLevel, 1);
  assert.equal(item.stats[0].value, 40 * 1.08);
  // factor stat: 1 + (1.08 - 1) * 1.08
  assert.ok(Math.abs(item.stats[1].value - (1 + 0.08 * 1.08)) < 1e-9);
});

test('upgrade cost scales with level and grade, and deducts exactly', () => {
  const item = itemWithStats({ grade: 'B', forgeLevel: 2 });
  const cost = getItemUpgradeCost(item);
  // base 3000 gold * (level+1=3) * gradeMultiplier(B=7)
  assert.equal(cost.gold, 3000 * 3 * 7);

  const inv = inventory();
  const before = { ...inv };
  upgradeItem(item, inv);
  assert.equal(inv.gold, before.gold - cost.gold);
});

test('upgrade refuses an item with no rolled stats', () => {
  const item = itemWithStats({ stats: [] });
  const result = upgradeItem(item, inventory());
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'nothing_to_upgrade');
});

test('upgrade refuses insufficient resources without mutating the item', () => {
  const item = itemWithStats();
  const before = JSON.parse(JSON.stringify(item.stats));
  const result = upgradeItem(item, inventory({ gold: 0 }));

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'not_enough_gold');
  assert.deepEqual(item.stats, before);
  assert.equal(item.forgeLevel, 0);
});

test('upgrade refuses past the max level', () => {
  const item = itemWithStats({ forgeLevel: MAX_UPGRADE_LEVEL });
  const result = upgradeItem(item, inventory());
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'max_level');
});

test('getItemUpgradeLevel clamps out-of-range values', () => {
  assert.equal(getItemUpgradeLevel({ forgeLevel: -5 }), 0);
  assert.equal(getItemUpgradeLevel({ forgeLevel: 999 }), MAX_UPGRADE_LEVEL);
  assert.equal(getItemUpgradeLevel({}), 0);
});
