import test from 'node:test';
import assert from 'node:assert/strict';
import craftItem, {
  craftMaterialKey, craftNeedExp, ensureCraft, getRecipe, isRecipeLearned, learnRecipe, listRecipes, missingForRecipe, rollCraftDrops, visibleRecipes,
} from '../functions/game/equipment/craftItem.js';
import { getCatalog } from '../functions/game/equipment/catalog.js';
import equipmentTemplate from '../template/equipmentTemplate.js';
import materialsTemplate from '../template/materialsTemplate.js';
import { addMaterial, getMaterialCount } from '../functions/game/player/materials.js';

function player(overrides = {}) {
  return {
    game: {
      stats: { lvl: 99 },
      inventory: { gold: 10_000_000, ironOre: 100_000, equipment: { name: 'Экипировка', items: [] } },
      ...overrides,
    },
  };
}

function stock(session, recipe) {
  for (const [key, need] of Object.entries(recipe.materials)) addMaterial(session, key, need);
}

test('every catalog item has a recipe whose materials exist in the materials template', () => {
  const recipes = listRecipes();
  assert.equal(recipes.length, getCatalog().filter(item => !item.epic).length, 'epic jewellery has no recipe');
  const keys = new Set(materialsTemplate.map((material) => material.key));
  for (const recipe of recipes) {
    assert.ok(recipe.ironOre >= 1, recipe.id);
    assert.ok(recipe.gold > 0 && recipe.successRate > 0 && recipe.successRate <= 1, recipe.id);
    for (const [key, amount] of Object.entries(recipe.materials)) {
      assert.ok(keys.has(key), `${recipe.id}: ${key}`);
      assert.ok(amount >= 1);
    }
  }
});

test('recipes get dearer, riskier and need more skill with every grade', () => {
  const sword = (grade) => getRecipe(`${grade}:weapon:oneHandedSword`);
  const grades = equipmentTemplate.grades.map((grade) => grade.name);
  for (let i = 1; i < grades.length; i++) {
    assert.ok(sword(grades[i]).ironOre > sword(grades[i - 1]).ironOre, grades[i]);
    assert.ok(sword(grades[i]).gold > sword(grades[i - 1]).gold, grades[i]);
    assert.ok(sword(grades[i]).craftLevel > sword(grades[i - 1]).craftLevel, grades[i]);
  }
  assert.equal(sword('noGrade').successRate, 1);
  assert.equal(sword('noGrade').learnPrice, 0);
  assert.equal(sword('B').successRate, 0.6);
  assert.equal(getRecipe('B:jewelry:ring').successRate, 0.7);
});

test('what a recipe is made of depends on the kind of item', () => {
  assert.ok(getRecipe('A:armor:light:fullBody').materials[craftMaterialKey('leather', 'A')]);
  assert.ok(getRecipe('A:armor:robe:fullBody').materials[craftMaterialKey('fiber', 'A')]);
  assert.ok(getRecipe('A:jewelry:ring').materials[craftMaterialKey('gem', 'A')]);
  assert.ok(getRecipe('A:weapon:bow').materials[craftMaterialKey('binder', 'A')]);
  assert.ok(getRecipe('A:armor:heavy:body').ironOre > getRecipe('A:armor:light:fullBody').ironOre, 'metal armor eats ore');
  assert.ok(getRecipe('S:weapon:bow').ironOre > getRecipe('S:armor:heavy:helmet').ironOre, 'a weapon is the most expensive piece');
});

test('a successful craft spends everything, adds the item and trains the skill', () => {
  const session = player();
  const recipe = getRecipe('noGrade:weapon:dagger');
  stock(session, recipe);

  const result = craftItem(session, recipe.id, { random: () => 0 });

  assert.equal(result.ok, true);
  assert.equal(result.success, true);
  assert.equal(result.item.name, 'Sword Breaker');
  assert.equal(session.game.inventory.equipment.items.length, 1);
  assert.equal(session.game.inventory.ironOre, 100_000 - recipe.ironOre);
  assert.equal(session.game.inventory.gold, 10_000_000 - recipe.gold);
  for (const key of Object.keys(recipe.materials)) assert.equal(getMaterialCount(session, key), 0);
  assert.equal(result.exp, 20);
});

test('a failed craft loses the materials and the fee but still trains the skill', () => {
  const session = player();
  session.game.craft = { level: 3, exp: 0, recipes: [] };
  learnRecipe(session, 'C:weapon:bow');
  const recipe = getRecipe('C:weapon:bow');
  stock(session, recipe);

  const result = craftItem(session, recipe.id, { random: () => 0.99 });

  assert.equal(result.ok, true);
  assert.equal(result.success, false);
  assert.equal(result.item, null);
  assert.equal(session.game.inventory.equipment.items.length, 0);
  assert.equal(session.game.inventory.ironOre, 100_000 - recipe.ironOre);
  for (const key of Object.keys(recipe.materials)) assert.equal(getMaterialCount(session, key), 0);
  assert.equal(result.exp, 8 + 15 * 2);
});

test('the success rate matches the recipe over many rolls', () => {
  let made = 0;
  const trials = 3000;
  let state = 7;
  const random = () => ((state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296);
  for (let i = 0; i < trials; i++) {
    const session = player();
    session.game.craft = { level: 9, exp: 0, recipes: ['B:weapon:bow'] };
    stock(session, getRecipe('B:weapon:bow'));
    if (craftItem(session, 'B:weapon:bow', { random }).success) made++;
  }
  assert.ok(Math.abs(made / trials - 0.6) < 0.035, `${made / trials}`);
});

test('crafting skill levels up with experience, quadratically harder', () => {
  const session = player();
  const craft = ensureCraft(session);
  assert.equal(craft.level, 1);
  assert.equal(craftNeedExp(1), 60);
  assert.equal(craftNeedExp(3), 540);
  const recipe = getRecipe('noGrade:weapon:dagger');
  let levelled = false;
  for (let i = 0; i < 4; i++) {
    stock(session, recipe);
    levelled = craftItem(session, recipe.id, { random: () => 0 }).leveledUp || levelled;
  }
  assert.equal(levelled, true, '80 experience passes the first 60');
  assert.equal(session.game.craft.level, 2);
  assert.equal(session.game.craft.exp, 20);
});

test('crafting is refused without the skill, the level, the recipe or the materials, and nothing is spent', () => {
  const session = player({ stats: { lvl: 50 } });
  const id = 'C:weapon:bow';
  assert.equal(craftItem(session, id).reason, 'recipe_not_learned');
  assert.equal(learnRecipe(session, id).reason, 'craft_level_too_low');
  session.game.craft = { level: 3, exp: 0, recipes: [] };
  assert.equal(learnRecipe(session, id).ok, true);
  assert.equal(isRecipeLearned(session, getRecipe(id)), true);
  const before = JSON.stringify(session.game.inventory);
  const refused = craftItem(session, id);
  assert.equal(refused.reason, 'not_enough_materials');
  assert.ok(Object.keys(refused.missing).length > 0);
  assert.equal(JSON.stringify(session.game.inventory), before.replace(/"gold":\d+/, (m) => m), 'inventory untouched');

  session.game.craft.level = 1;
  stock(session, getRecipe(id));
  assert.equal(craftItem(session, id).reason, 'craft_level_too_low');
  session.game.craft.level = 3;
  session.game.stats.lvl = 10;
  assert.equal(craftItem(session, id).reason, 'level_too_low');
  assert.equal(craftItem(session, 'nope').reason, 'unknown_recipe');
  assert.deepEqual(missingForRecipe(session, getRecipe(id)), {}, 'stocked up: nothing missing');
});

test('only recipes a class can wear and a level can reach are visible', () => {
  const session = player({ stats: { lvl: 30 }, gameClass: { stats: { name: 'mage' } } });
  const recipes = visibleRecipes(session);
  assert.ok(recipes.length > 0);
  assert.ok(recipes.every((recipe) => recipe.minLevel <= 35));
  assert.ok(recipes.some((recipe) => recipe.id === 'D:armor:robe:fullBody'));
  assert.ok(!recipes.some((recipe) => recipe.id === 'D:armor:heavy:body'));
  assert.ok(!recipes.some((recipe) => recipe.id === 'S:armor:robe:fullBody'));
});

test('bosses drop the crafting materials of the fighter grade, more for the top damage dealers', () => {
  const member = player({ stats: { lvl: 45 } });
  const drops = rollCraftDrops(member, { tier: 1, place: 1, random: () => 0 });
  assert.deepEqual(drops.map((drop) => drop.item), ['binder', 'leather', 'fiber', 'gem'].map((family) => `craft_${family}_C`));
  assert.ok(drops.every((drop) => drop.amount >= 1));
  assert.equal(getMaterialCount(member, 'craft_gem_C'), 1);
  assert.deepEqual(rollCraftDrops(member, { random: () => 0.999 }), []);
  const hard = player({ stats: { lvl: 45 } });
  rollCraftDrops(hard, { tier: 3, place: 1, random: () => 0 });
  assert.equal(getMaterialCount(hard, 'craft_gem_C'), 3);
});
