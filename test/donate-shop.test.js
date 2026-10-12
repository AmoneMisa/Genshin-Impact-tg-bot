import test from 'node:test';
import assert from 'node:assert/strict';
import luckShop, { LUCK_SHOP_GROUPS } from '../template/luckShop.js';
import materials from '../template/materialsTemplate.js';
import potionsTemplate from '../template/potionsInInventoryTemplate.js';
import elixirs from '../template/elixirs.js';
import { buyLuckItem, getLuckShopState } from '../miniapp/luck.js';
import { getCatalog, instantiate } from '../functions/game/equipment/catalog.js';
import { enchantItem, blessedTypedKey, safeTypedKey } from '../functions/game/equipment/enchantItem.js';
import { addMaterial, getMaterialCount } from '../functions/game/player/materials.js';
import { DAY_MS, expireTimedItems, isTimedItem } from '../functions/game/equipment/timedItems.js';
import { uniqueEquipped } from '../functions/game/equipment/itemBonuses.js';
import equipItem from '../functions/game/equipment/equipItem.js';
import { performEquipmentAction, getEquipmentState } from '../miniapp/equipment.js';
import { useInventoryPotion } from '../miniapp/inventory.js';

const NOW = Date.UTC(2026, 9, 12, 12);

function player(level = 90, coins = 1000, className = 'warrior') {
  return {
    userId: 1,
    game: {
      effects: [],
      equipmentStats: {},
      stats: { lvl: level },
      gameClass: { stats: { name: className, hp: 100, maxHp: 1000, mp: 10, maxMp: 400, cp: 5, maxCp: 500 }, skills: [] },
      inventory: { gold: 0, crystals: 0, ironOre: 0, luckCoins: coins, potions: { items: [] }, equipment: { items: [] }, materials: {} },
    },
  };
}

const gradeItem = (grade, mainType) => instantiate(getCatalog().find(item => item.grade === grade && item.mainType === mainType && !item.epic));

test('every shop grant points at something that exists', () => {
  const materialKeys = new Set(materials.map(material => material.key));
  const potionIds = new Set(potionsTemplate.map(potion => potion.id));
  const groups = new Set(LUCK_SHOP_GROUPS.map(group => group.id));
  for (const item of luckShop) {
    assert.ok(groups.has(item.group), item.id);
    for (const key of Object.keys(item.grant.materials || {})) assert.ok(materialKeys.has(key), `${item.id}: ${key}`);
    if (item.grant.potion) assert.ok(potionIds.has(item.grant.potion.id), item.id);
  }
  assert.deepEqual(luckShop.filter(item => item.group === 'scrolls').length, 8, '2 grades x weapon/armor x blessed/indestructible');
  assert.equal(luckShop.filter(item => item.group === 'elixirs').length, elixirs.length);
});

test('scrolls and elixirs are delivered whole; removed craft bundles are rejected', () => {
  const s = player();
  assert.equal(buyLuckItem(s, 'scroll-blessed_weapon_S', NOW).ok, true);
  assert.equal(buyLuckItem(s, 'scroll-safe_armor_S', NOW).ok, true);
  assert.equal(getMaterialCount(s, 'blessed_weapon_S'), 1);
  assert.equal(getMaterialCount(s, 'safe_armor_S'), 1);

  buyLuckItem(s, 'elixir-elixir-life-A', NOW);
  buyLuckItem(s, 'elixir-elixir-life-A', NOW);
  const stack = s.game.inventory.potions.items.find(potion => potion.id === 'elixir-life-A');
  assert.equal(stack.count, 10);

  assert.equal(buyLuckItem(s, 'craft-S', NOW).reason, 'unknown_item');
  assert.equal(getMaterialCount(s, 'craft_gem_S'), 0);
  assert.equal(getMaterialCount(s, 'craft_binder_S'), 0);
  assert.equal(s.game.inventory.ironOre, 0);
  assert.equal(s.game.inventory.luckCoins, 1000 - 12 - 18 - 10 - 10);
});

test('the shop lists categories with items; rented epic jewelry is offered to every class', () => {
  const state = getLuckShopState(player(90, 5, 'warrior'), NOW);
  assert.deepEqual(state.groups.map(group => group.id), ['soul', 'epic', 'passes', 'quest', 'lifestones', 'scrolls', 'elixirs', 'buffs', 'tries']);
  assert.ok(state.items.filter(item => item.group === 'epic').length >= 5);
  const mage = getLuckShopState(player(90, 5, 'mage'), NOW).items.filter(item => item.group === 'epic').map(item => item.title);
  const warrior = state.items.filter(item => item.group === 'epic').map(item => item.title);
  assert.deepEqual(mage, warrior, 'epic jewelry is offered to every eligible class');
});

function epicJewelryId(s) {
  return getLuckShopState(s, NOW).items.find(item => item.group === 'epic' && item.artItem?.mainType === 'jewelry').id;
}

test('a rented epic item works for seven days, extends when bought again, then disappears', () => {
  const s = player();
  const id = epicJewelryId(s);
  const bought = buyLuckItem(s, id, NOW);
  assert.equal(bought.ok, true);
  const [item] = s.game.inventory.equipment.items;
  assert.equal(isTimedItem(item), true);
  assert.equal(item.expiresAt, NOW + 7 * DAY_MS);

  assert.equal(equipItem(s, item), 0, 'it can be equipped like any item');
  assert.equal(uniqueEquipped(s.game.equipmentStats).length, 1);

  const again = buyLuckItem(s, id, NOW + DAY_MS);
  assert.equal(again.extended, true);
  assert.equal(s.game.inventory.equipment.items.length, 1);
  assert.equal(item.expiresAt, NOW + 14 * DAY_MS);

  assert.deepEqual(expireTimedItems(s, NOW + 13 * DAY_MS), []);
  assert.deepEqual(expireTimedItems(s, NOW + 15 * DAY_MS), [item.name]);
  assert.equal(s.game.inventory.equipment.items.length, 0);
  assert.equal(Object.keys(s.game.equipmentStats).filter(slot => s.game.equipmentStats[slot]).length, 0, 'it is taken off too');
});

test('an expired rented item gives no stats even before it is cleaned up', () => {
  const s = player();
  buyLuckItem(s, epicJewelryId(s), Date.now());
  const [item] = s.game.inventory.equipment.items;
  equipItem(s, item);
  assert.equal(uniqueEquipped(s.game.equipmentStats).length, 1);
  Object.values(s.game.equipmentStats).forEach(slot => { if (slot) slot.expiresAt = Date.now() - 1; });
  assert.equal(uniqueEquipped(s.game.equipmentStats).length, 0);
});

test('rented items cannot be sold or crystallized, and the equipment screen shows the time left', () => {
  const s = player();
  buyLuckItem(s, epicJewelryId(s), Date.now());
  const dto = getEquipmentState(s).items[0];
  assert.equal(dto.timed, true);
  assert.equal(dto.daysLeft, 7);
  assert.equal(performEquipmentAction(s, dto.key, 'sell').reason, 'timed_item');
  assert.equal(performEquipmentAction(s, dto.key, 'crystallize').reason, 'timed_item');
  assert.equal(s.game.inventory.equipment.items.length, 1);
});

test('a character below the grade cannot rent epic gear', () => {
  const s = player(50, 1000);
  const offer = getLuckShopState(s, NOW).items.find(item => item.group === 'epic');
  assert.equal(offer.locked, true);
  assert.equal(buyLuckItem(s, offer.id, NOW).reason, 'level_too_low');
  assert.equal(s.game.inventory.luckCoins, 1000);
});

test('blessed typed scrolls reset a failed item to +0, indestructible ones keep it as it was', () => {
  const failing = () => 0.999;
  const run = (setup) => {
    const s = player();
    const weapon = gradeItem('A', 'weapon');
    weapon.enchant = 7;
    s.game.inventory.equipment.items.push(weapon);
    setup(s, weapon);
    return { s, weapon };
  };

  const original = Math.random;
  Math.random = failing;
  try {
    const safe = run((s, weapon) => addMaterial(s, safeTypedKey(weapon), 1));
    const keptResult = enchantItem(safe.s, safe.weapon, { scroll: 'safeTyped' });
    assert.equal(keptResult.outcome, 'kept');
    assert.equal(safe.weapon.enchant, 7);
    assert.equal(safe.s.game.inventory.equipment.items.length, 1, 'the item survives');
    assert.equal(getMaterialCount(safe.s, safeTypedKey(safe.weapon)), 0, 'the scroll is used up');

    const blessed = run((s, weapon) => addMaterial(s, blessedTypedKey(weapon), 1));
    const resetResult = enchantItem(blessed.s, blessed.weapon, { scroll: 'blessedTyped' });
    assert.equal(resetResult.outcome, 'reset');
    assert.equal(blessed.weapon.enchant, 0, 'enchantment is reset');
    assert.equal(blessed.s.game.inventory.equipment.items.length, 1);

    const plain = run((s, weapon) => addMaterial(s, `scroll_${weapon.grade}`, 1));
    assert.equal(enchantItem(plain.s, plain.weapon).outcome, 'broken');
    assert.equal(plain.s.game.inventory.equipment.items.length, 0, 'a plain scroll still destroys the item');

    Math.random = () => 0;
    const lucky = run((s, weapon) => addMaterial(s, safeTypedKey(weapon), 1));
    assert.equal(enchantItem(lucky.s, lucky.weapon, { scroll: 'safeTyped' }).outcome, 'success');
    assert.equal(lucky.weapon.enchant, 8);
  } finally {
    Math.random = original;
  }
});

test('weapon scrolls do not work on armor and armor scrolls do not work on weapons', () => {
  const s = player();
  const armor = gradeItem('A', 'armor');
  const weapon = gradeItem('A', 'weapon');
  s.game.inventory.equipment.items.push(armor, weapon);
  addMaterial(s, 'safe_weapon_A', 3);
  assert.equal(enchantItem(s, armor, { scroll: 'safeTyped' }).reason, 'no_scroll');
  assert.equal(enchantItem(s, weapon, { scroll: 'safeTyped' }).ok, true);
  assert.equal(safeTypedKey(armor), 'safe_armor_A');
  assert.equal(blessedTypedKey(weapon), 'blessed_weapon_A');
});

test('A and S grade elixirs restore HP, MP and CP by a share and need the character level', () => {
  const s = player(70);
  const lifeA = potionsTemplate.find(potion => potion.id === 'elixir-life-A');
  const cpS = potionsTemplate.find(potion => potion.id === 'elixir-cp-S');
  assert.equal(lifeA.power, 60);
  assert.equal(cpS.power, 100);
  s.game.inventory.potions.items.push({ ...lifeA, count: 2 }, { ...cpS, count: 1 });

  const life = useInventoryPotion(s, '0');
  assert.equal(life.ok, true);
  assert.equal(s.game.gameClass.stats.hp, 100);

  const tooLow = useInventoryPotion(s, '1');
  assert.equal(tooLow.reason, 'level_too_low');
  assert.equal(s.game.inventory.potions.items[1].count, 1, 'nothing is used up');

  s.game.stats.lvl = 80;
  const cp = useInventoryPotion(s, '1');
  assert.equal(cp.ok, true);
  assert.equal(cp.resource, 'cp');
  assert.equal(s.game.gameClass.stats.cp, 500);
  assert.equal(useInventoryPotion(s, '0').ok, true);
  s.game.inventory.potions.items.push({ ...cpS, count: 1 });
  assert.equal(useInventoryPotion(s, '2').reason, 'cp_full');
});
