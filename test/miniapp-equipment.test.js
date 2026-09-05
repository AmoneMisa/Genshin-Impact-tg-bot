import test from 'node:test';
import assert from 'node:assert/strict';
import { getEquipmentState, performEquipmentAction, craftEquipmentItem } from '../miniapp/equipment.js';
import { CRAFT_COSTS } from '../functions/game/equipment/craftItem.js';

function item(overrides = {}) {
  return {
    name: '(D - Grade) Test item',
    translatedName: 'Тестовый предмет',
    description: 'test',
    grade: 'D',
    rarity: 'common',
    rarityTranslated: 'Обычное',
    mainType: 'weapon',
    category: 'sword',
    kind: 'oneHandedSword',
    classOwner: ['warrior'],
    quality: { current: 5, max: 10 },
    persistence: { current: 30, max: 50 },
    slots: ['rightHand'],
    stats: [{ name: 'power', value: 10 }],
    cost: 1200,
    isUsed: false,
    ...overrides,
  };
}

function session(items = [], gold = 100) {
  return {
    game: {
      stats: { lvl: 50 },
      equipmentStats: {},
      inventory: {
        gold,
        crystals: 100_000,
        ironOre: 100_000,
        equipment: { name: 'Экипировка', items },
      },
    },
  };
}

test('equipment state exposes safe action keys, forge level, and resource wallet', () => {
  const player = session([item()], 4321);
  player.game.inventory.crystals = 123;
  player.game.inventory.ironOre = 456;
  const state = getEquipmentState(player);

  assert.equal(state.count, 1);
  assert.equal(state.items[0].minLevel, 21);
  assert.equal(state.items[0].forgeLevel, 0);
  assert.match(state.items[0].key, /^0:[a-f0-9]{16}$/);
  assert.equal(state.items[0].isUsed, false);
  assert.deepEqual(state.resources, { gold: 4321, crystals: 123, ironOre: 456 });
});

test('forge state quotes craft costs and marks missing resources server-side', () => {
  const player = session([], 1000);
  player.game.inventory.crystals = 0;
  player.game.inventory.ironOre = 10;

  const state = getEquipmentState(player);
  const grade = state.craftableGrades.find(entry => entry.name === 'D');

  assert.equal(grade.affordable, false);
  assert.deepEqual(grade.cost, CRAFT_COSTS.D);
  assert.deepEqual(grade.missingResources, { gold: 1000, crystals: 5, ironOre: 70 });
});

test('equipping a conflicting item cleanly unequips the displaced one', () => {
  const oldItem = item({ name: 'Old sword', isUsed: true });
  const newItem = item({ name: 'New sword', grade: 'C', cost: 3400 });
  const player = session([oldItem, newItem]);
  player.game.equipmentStats.rightHand = { ...oldItem, minLvl: 21, isFilled: true };

  const key = getEquipmentState(player).items[1].key;
  const result = performEquipmentAction(player, key, 'equip');

  assert.equal(result.ok, true);
  assert.equal(oldItem.isUsed, false);
  assert.equal(newItem.isUsed, true);
  assert.equal(player.game.equipmentStats.rightHand.name, 'New sword');
  assert.equal(result.equipment.equippedCount, 1);
});

test('stale item key cannot mutate a shifted or modified inventory item', () => {
  const player = session([item()]);
  const key = getEquipmentState(player).items[0].key;
  player.game.inventory.equipment.items[0].cost += 1;

  const result = performEquipmentAction(player, key, 'sell');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'stale_item');
  assert.equal(player.game.inventory.equipment.items.length, 1);
});

test('selling equipped gear unequips it, removes it and credits gold', () => {
  const equipped = item({ name: 'Sell me', isUsed: true, cost: 2500 });
  const player = session([equipped], 500);
  player.game.equipmentStats.rightHand = { ...equipped, minLvl: 21, isFilled: true };

  const key = getEquipmentState(player).items[0].key;
  const result = performEquipmentAction(player, key, 'sell');

  assert.equal(result.ok, true);
  assert.equal(result.soldGold, 2500);
  assert.equal(player.game.inventory.gold, 3000);
  assert.equal(player.game.inventory.equipment.items.length, 0);
  assert.equal(player.game.equipmentStats.rightHand, null);
});

test('unequipped gear can be sold without touching occupied combat slots', () => {
  const equipped = item({ name: 'Keep me', isUsed: true, cost: 1000 });
  const spare = item({ name: 'Spare', kind: 'dagger', cost: 700, isUsed: false });
  const player = session([equipped, spare], 25);
  player.game.equipmentStats.rightHand = { ...equipped, minLvl: 21, isFilled: true };

  const key = getEquipmentState(player).items[1].key;
  const result = performEquipmentAction(player, key, 'sell');

  assert.equal(result.ok, true);
  assert.equal(player.game.inventory.gold, 725);
  assert.equal(player.game.inventory.equipment.items.length, 1);
  assert.equal(player.game.inventory.equipment.items[0].name, 'Keep me');
  assert.equal(player.game.equipmentStats.rightHand.name, 'Keep me');
});

test('craftEquipmentItem spends all quoted resources and adds a real item to inventory', () => {
  const player = session([], 1_000_000);
  const beforeCrystals = player.game.inventory.crystals;
  const beforeOre = player.game.inventory.ironOre;
  const state = getEquipmentState(player);
  assert.ok(state.craftableGrades.some(g => g.name === 'D'));

  const result = craftEquipmentItem(player, 'D');

  assert.equal(result.ok, true);
  assert.deepEqual(result.spent, CRAFT_COSTS.D);
  assert.equal(player.game.inventory.gold, 1_000_000 - CRAFT_COSTS.D.gold);
  assert.equal(player.game.inventory.crystals, beforeCrystals - CRAFT_COSTS.D.crystals);
  assert.equal(player.game.inventory.ironOre, beforeOre - CRAFT_COSTS.D.ironOre);
  assert.equal(player.game.inventory.equipment.items.length, 1);
  assert.equal(result.item.grade, 'D');
});

test('craftEquipmentItem refuses a grade above the player level', () => {
  const player = session([], 1_000_000);
  player.game.stats.lvl = 5;

  const result = craftEquipmentItem(player, 'S');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'level_too_low');
  assert.equal(player.game.inventory.equipment.items.length, 0);
});

test('upgrade action scales stats, syncs the equipped snapshot, and reports the new level', () => {
  const equipped = item({ name: 'My sword', isUsed: true, stats: [{ name: 'attack', value: 40 }] });
  const player = session([equipped], 1_000_000);
  player.game.equipmentStats.rightHand = { ...equipped, minLvl: 21, isFilled: true, stats: [{ name: 'attack', value: 40 }] };

  const key = getEquipmentState(player).items[0].key;
  const result = performEquipmentAction(player, key, 'upgrade');

  assert.equal(result.ok, true);
  assert.equal(result.level, 1);
  assert.ok(result.spent.gold > 0);
  assert.equal(equipped.stats[0].value, 40 * 1.08);
  assert.equal(player.game.equipmentStats.rightHand.stats[0].value, 40 * 1.08);
});

test('upgrading a spare item never rewrites an equipped item of the same kind and slots', () => {
  const equipped = item({ name: 'Equipped sword', isUsed: true, stats: [{ name: 'attack', value: 40 }] });
  const spare = item({ name: 'Spare sword', isUsed: false, stats: [{ name: 'attack', value: 20 }] });
  const player = session([equipped, spare], 1_000_000);
  player.game.equipmentStats.rightHand = { ...equipped, minLvl: 21, isFilled: true, stats: [{ name: 'attack', value: 40 }] };

  const key = getEquipmentState(player).items[1].key;
  const result = performEquipmentAction(player, key, 'upgrade');

  assert.equal(result.ok, true);
  assert.equal(spare.stats[0].value, 20 * 1.08);
  assert.equal(player.game.equipmentStats.rightHand.stats[0].value, 40);
  assert.equal(player.game.equipmentStats.rightHand.name, 'Equipped sword');
});

test('forge mutation invalidates the old item key', () => {
  const player = session([item({ stats: [{ name: 'attack', value: 10 }] })], 1_000_000);
  const oldKey = getEquipmentState(player).items[0].key;

  const upgraded = performEquipmentAction(player, oldKey, 'upgrade');
  const newKey = upgraded.equipment.items[0].key;
  const replay = performEquipmentAction(player, oldKey, 'upgrade');

  assert.equal(upgraded.ok, true);
  assert.notEqual(newKey, oldKey);
  assert.equal(replay.ok, false);
  assert.equal(replay.reason, 'stale_item');
});

test('upgrade action rejects an item with nothing to upgrade', () => {
  const bareItem = item({ stats: [] });
  const player = session([bareItem], 1_000_000);
  const key = getEquipmentState(player).items[0].key;

  const result = performEquipmentAction(player, key, 'upgrade');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'nothing_to_upgrade');
});
