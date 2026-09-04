import test from 'node:test';
import assert from 'node:assert/strict';
import { getEquipmentState, performEquipmentAction } from '../miniapp/equipment.js';

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
        equipment: { name: 'Экипировка', items },
      },
    },
  };
}

test('equipment state exposes safe action keys and grade level', () => {
  const player = session([item()]);
  const state = getEquipmentState(player);

  assert.equal(state.count, 1);
  assert.equal(state.items[0].minLevel, 21);
  assert.match(state.items[0].key, /^0:[a-f0-9]{16}$/);
  assert.equal(state.items[0].isUsed, false);
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
