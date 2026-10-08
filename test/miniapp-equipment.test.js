import test from 'node:test';
import assert from 'node:assert/strict';
import { getEquipmentState, performEquipmentAction, craftEquipmentItem, learnEquipmentRecipe, buyEnchantScroll } from '../miniapp/equipment.js';
import { findCatalogItem, instantiate } from '../functions/game/equipment/catalog.js';

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
  assert.equal(state.items[0].minLevel, 20);
  assert.equal(state.items[0].forgeLevel, 0);
  assert.match(state.items[0].key, /^0:[a-f0-9]{16}$/);
  assert.equal(state.items[0].isUsed, false);
  assert.deepEqual(state.resources, { gold: 4321, crystals: 123, ironOre: 456 });
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

test('forge state lists recipes with materials, chance and what is missing', () => {
  const player = session([], 1000);
  player.game.inventory.ironOre = 10;
  player.game.inventory.materials = { craft_binder_D: 2 };
  player.game.gameClass = { stats: { name: 'warrior' } };

  const { craft } = getEquipmentState(player);
  assert.equal(craft.level, 1);
  const sword = craft.recipes.find(entry => entry.id === 'D:weapon:oneHandedSword');
  assert.equal(sword.name, 'Elven Long Sword');
  assert.equal(sword.successRate, 0.6);
  assert.equal(sword.learned, false, 'D recipes have to be learned');
  assert.equal(sword.canCraft, false);
  assert.ok(sword.materials.some(row => row.key === 'craft_binder_D' && row.have === 2));
  assert.ok(sword.missing.ironOre > 0);
  assert.ok(craft.recipes.every(entry => entry.minLevel <= 55), 'grades far above the player level stay hidden');
  assert.ok(!craft.recipes.some(entry => entry.id === 'D:armor:robe:fullBody'), 'only items the class can use are shown');
});

test('craftEquipmentItem learns, spends the quoted materials and adds the item', () => {
  const player = session([], 1_000_000);
  const recipeId = 'noGrade:weapon:oneHandedSword';
  const row = getEquipmentState(player).craft.recipes.find(entry => entry.id === recipeId);
  assert.equal(row.learned, true, 'no-grade recipes are known from the start');
  player.game.inventory.ironOre = 100;
  player.game.inventory.materials = Object.fromEntries(row.materials.filter(m => m.key !== 'ironOre').map(m => [m.key, m.need]));

  const realRandom = Math.random;
  Math.random = () => 0;
  let result;
  try {
    result = craftEquipmentItem(player, recipeId);
  } finally {
    Math.random = realRandom;
  }

  assert.equal(result.ok, true);
  assert.equal(result.success, true);
  assert.equal(result.item.name, 'Long Sword');
  assert.equal(player.game.inventory.equipment.items.length, 1);
  assert.equal(player.game.inventory.ironOre, 100 - row.materials.find(m => m.key === 'ironOre').need);
  assert.equal(player.game.inventory.gold, 1_000_000 - row.gold);
  assert.ok(Object.values(player.game.inventory.materials).every(count => count === 0));
  assert.ok(player.game.craft.exp > 0);
});

test('craftEquipmentItem refuses a recipe above the player level, an unlearned one and missing materials', () => {
  const player = session([], 1_000_000);
  player.game.stats.lvl = 5;
  assert.equal(craftEquipmentItem(player, 'S:weapon:bow').reason, 'recipe_not_learned');
  player.game.craft = { level: 9, exp: 0, recipes: ['S:weapon:bow'] };
  const tooLow = craftEquipmentItem(player, 'S:weapon:bow');
  assert.equal(tooLow.reason, 'level_too_low');
  assert.equal(tooLow.requiredLevel, 76);
  player.game.stats.lvl = 80;
  const missing = craftEquipmentItem(player, 'S:weapon:bow');
  assert.equal(missing.reason, 'not_enough_materials');
  assert.ok(Object.keys(missing.missing).some((key) => key.startsWith('craft_')));
  assert.equal(player.game.inventory.equipment.items.length, 0);
  assert.equal(craftEquipmentItem(player, 'nope').reason, 'unknown_recipe');
});

test('recipes are learned for gold, and only with the crafting skill and level they ask for', () => {
  const player = session([], 100);
  player.game.stats.lvl = 45;
  assert.equal(learnEquipmentRecipe(player, 'C:weapon:bow').reason, 'craft_level_too_low');
  player.game.craft = { level: 3, exp: 0, recipes: [] };
  assert.equal(learnEquipmentRecipe(player, 'C:weapon:bow').reason, 'not_enough_gold');
  player.game.inventory.gold = 1_000_000;
  const learned = learnEquipmentRecipe(player, 'C:weapon:bow');
  assert.equal(learned.ok, true);
  assert.equal(player.game.inventory.gold, 1_000_000 - learned.price);
  assert.equal(learnEquipmentRecipe(player, 'C:weapon:bow').reason, 'already_learned');
});

function catalogItem(id, overrides = {}) {
  return Object.assign(instantiate(findCatalogItem(id)), overrides);
}

function keyOf(player, worn) {
  return getEquipmentState(player).items.find((entry) => entry.uid === worn.uid).key;
}

function equip(player, worn) {
  const result = performEquipmentAction(player, keyOf(player, worn), 'equip');
  assert.equal(result.ok, true);
}

function withRandom(value, fn) {
  const realRandom = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = realRandom;
  }
}

test('enchanting inside the safe range always works, spends one scroll and syncs the worn snapshot', () => {
  const sword = catalogItem('D:weapon:oneHandedSword');
  const player = session([sword], 1_000_000);
  player.game.inventory.materials = { scroll_D: 3 };
  equip(player, sword);

  const result = performEquipmentAction(player, keyOf(player, sword), 'enchant');

  assert.equal(result.ok, true);
  assert.equal(result.outcome, 'success');
  assert.equal(result.level, 1);
  assert.equal(sword.enchant, 1);
  assert.equal(player.game.equipmentStats.rightHand.enchant, 1);
  assert.equal(player.game.inventory.materials.scroll_D, 2);
  assert.equal(result.item.forgeLevel, 1, 'the forge art still reads the old field');
});

test('enchanting a spare item never rewrites an identical item that is worn', () => {
  const worn = catalogItem('D:weapon:oneHandedSword');
  const spare = catalogItem('D:weapon:oneHandedSword');
  const player = session([worn, spare], 0);
  player.game.inventory.materials = { scroll_D: 2 };
  equip(player, worn);

  const result = performEquipmentAction(player, keyOf(player, spare), 'enchant');

  assert.equal(result.ok, true);
  assert.equal(spare.enchant, 1);
  assert.equal(player.game.equipmentStats.rightHand.enchant, 0);
  assert.equal(getEquipmentState(player).items.filter((entry) => entry.isUsed).length, 1, 'only one of two identical swords is worn');
});

test('an enchant changes the item key, so a replayed request is stale', () => {
  const sword = catalogItem('D:weapon:oneHandedSword');
  const player = session([sword], 0);
  player.game.inventory.materials = { scroll_D: 2 };
  const oldKey = keyOf(player, sword);

  assert.equal(performEquipmentAction(player, oldKey, 'enchant').ok, true);
  const replay = performEquipmentAction(player, oldKey, 'enchant');

  assert.equal(replay.ok, false);
  assert.equal(replay.reason, 'stale_item');
});

test('enchanting needs a scroll of the item grade and refuses no-grade gear', () => {
  const sword = catalogItem('D:weapon:oneHandedSword');
  const starter = catalogItem('noGrade:weapon:oneHandedSword');
  const player = session([sword, starter], 0);
  player.game.inventory.materials = { scroll_C: 5 };

  assert.equal(performEquipmentAction(player, keyOf(player, sword), 'enchant').reason, 'no_scroll');
  player.game.inventory.materials.scroll_D = 5;
  assert.equal(performEquipmentAction(player, keyOf(player, starter), 'enchant').reason, 'not_enchantable');
  assert.equal(player.game.inventory.materials.scroll_D, 5);
});

test('a failed plain scroll above the safe level destroys the item and pays crystals', () => {
  const sword = catalogItem('D:weapon:oneHandedSword', { enchant: 3 });
  const player = session([sword], 0);
  player.game.inventory.materials = { scroll_D: 1 };
  equip(player, sword);

  const result = withRandom(0.99, () => performEquipmentAction(player, keyOf(player, sword), 'enchant')); // above the 66% chance

  assert.equal(result.ok, true);
  assert.equal(result.outcome, 'broken');
  assert.equal(result.item, null);
  assert.equal(result.crystals, 20, 'D-grade main weapon');
  assert.equal(player.game.inventory.materials.crystal_D, 20);
  assert.equal(player.game.inventory.equipment.items.length, 0);
  assert.equal(player.game.equipmentStats.rightHand, null);
});

test('a failed blessed scroll only drops the item back to the safe level', () => {
  const sword = catalogItem('D:weapon:oneHandedSword', { enchant: 9 });
  const player = session([sword], 0);
  player.game.inventory.materials = { blessed_D: 1 };

  const result = withRandom(0.99, () => performEquipmentAction(player, keyOf(player, sword), 'enchant', { blessed: true }));

  assert.equal(result.outcome, 'reset');
  assert.equal(result.level, 3);
  assert.equal(sword.enchant, 3);
  assert.equal(player.game.inventory.equipment.items.length, 1);
});

test('crystallize turns gear into crystals of its grade', () => {
  const helmet = catalogItem('C:armor:heavy:helmet');
  const player = session([helmet], 0);
  equip(player, helmet);

  const result = performEquipmentAction(player, keyOf(player, helmet), 'crystallize');

  assert.equal(result.ok, true);
  assert.equal(result.crystals, Math.round(45 * 0.35));
  assert.equal(player.game.inventory.materials.crystal_C, result.crystals);
  assert.equal(player.game.inventory.equipment.items.length, 0);
  assert.equal(player.game.equipmentStats.helmet, null);
});

test('a class cannot wear another class armor type', () => {
  const robe = catalogItem('D:armor:robe:helmet');
  const player = session([robe], 0);
  player.game.gameClass = { stats: { name: 'warrior' } };
  const key = keyOf(player, robe);

  const result = performEquipmentAction(player, key, 'equip');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong_class');

  player.game.gameClass.stats.name = 'mage';
  assert.equal(performEquipmentAction(player, key, 'equip').ok, true);
});

test('the scroll shop sells plain scrolls for gold or crystals and blessed ones for both', () => {
  const player = session([], 1_000_000);
  player.game.stats.lvl = 45;
  player.game.inventory.materials = { crystal_C: 30 };
  const state = getEquipmentState(player);
  assert.deepEqual(state.scrollShop.map((row) => row.grade), ['D', 'C']);

  assert.equal(buyEnchantScroll(player, 'C').ok, true);
  assert.equal(player.game.inventory.gold, 1_000_000 - 6500);
  assert.equal(buyEnchantScroll(player, 'C', { withCrystals: true }).ok, true);
  assert.equal(buyEnchantScroll(player, 'C', { blessed: true }).ok, true);
  assert.equal(player.game.inventory.materials.scroll_C, 2);
  assert.equal(player.game.inventory.materials.blessed_C, 1);
  assert.equal(player.game.inventory.materials.crystal_C, 30 - 3 - 12);
  assert.equal(player.game.inventory.gold, 1_000_000 - 6500 - 13000);

  assert.equal(buyEnchantScroll(player, 'S').reason, 'level_too_low');
  player.game.inventory.materials.crystal_C = 0;
  assert.equal(buyEnchantScroll(player, 'C', { blessed: true }).reason, 'not_enough_crystals');
});
