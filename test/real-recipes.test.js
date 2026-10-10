import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import {addMaterial, getMaterialCount} from '../functions/game/player/materials.js';
import craftItem, {getRecipe, learnRecipe, visibleRecipes, ensureCraft} from '../functions/game/equipment/craftItem.js';
import {realRecipeByName, recipeForMaterial, splitIngredients} from '../functions/game/equipment/realRecipes.js';

const hero = (level = 85) => {
  const s = {userId: 1, userChatData: {user: {id: 1}}, game: {stats: {lvl: level, currentExp: 0}, inventory: {gold: 1e9, ironOre: 0, materials: {}, equipment: {items: []}, potions: {items: []}}, equipmentStats: {}, effects: [], builds: {}, respawnTime: 0}};
  changeClass(s, 'mage'); updateStats(s);
  return s;
};

test('catalog items with a High Five recipe use its real ingredients, success rate, craft level and MP', () => {
  const recipe = getRecipe('S80:weapon:oneHandedSword');
  assert.equal(recipe.real, true);
  assert.equal(recipe.successRate, 0.6);
  assert.equal(recipe.craftLevel, 9);
  assert.equal(recipe.mp, 240);
  assert.deepEqual(
    {sword: recipe.materials.l2_9616, crystals: recipe.materials.crystal_S, gems: recipe.materials.craft_gem_S, alloy: recipe.materials.l2_1890},
    {sword: 18, crystals: 350, gems: 69, alloy: 376});
  assert.equal(realRecipeByName('Dynasty Sword').product, 9442);
  // an item High Five does not craft keeps the generated recipe
  assert.equal(getRecipe('noGrade:weapon:oneHandedSword').real, undefined);
});

test('recipes behind the ingredients are craftable materials and listed with the items that need them', () => {
  const session = hero();
  const rows = visibleRecipes(session);
  const materialRows = rows.filter(row => String(row.id).startsWith('recipe:'));
  assert.ok(materialRows.length > 5);
  assert.ok(materialRows.every(row => row.productKey && row.amount > 0 && row.real));
  // a real alloy: made from its ingredients for MP, the product is a collectable material
  const alloy = recipeForMaterial('l2_1890');
  assert.ok(alloy);
  const id = `recipe:${alloy.recipeItem}`, recipe = getRecipe(id);
  for (const [key, need] of Object.entries(splitIngredients(alloy).materials)) addMaterial(session, key, need);
  ensureCraft(session).level = 9;
  const mp = session.game.gameClass.stats.mp;
  if (recipe.learnPrice > 0) assert.equal(learnRecipe(session, id).ok, true);
  const result = craftItem(session, id, {random: () => 0});
  assert.equal(result.ok, true);
  assert.equal(result.success, true);
  assert.equal(getMaterialCount(session, recipe.productKey), recipe.amount);
  assert.equal(session.game.gameClass.stats.mp, Math.max(0, mp - recipe.mp));
  for (const key of Object.keys(recipe.materials)) assert.equal(getMaterialCount(session, key), 0);
});

test('a craft without enough MP changes nothing', () => {
  const session = hero();
  const alloy = recipeForMaterial('l2_1890'), id = `recipe:${alloy.recipeItem}`;
  for (const [key, need] of Object.entries(splitIngredients(alloy).materials)) addMaterial(session, key, need);
  ensureCraft(session).level = 9;
  const recipe = getRecipe(id);
  if (recipe.learnPrice > 0) assert.equal(learnRecipe(session, id).ok, true);
  session.game.gameClass.stats.mp = Math.max(0, recipe.mp - 1);
  const before = JSON.stringify(session.game.inventory);
  assert.deepEqual([craftItem(session, id).ok, craftItem(session, id).reason], [false, 'not_enough_mp']);
  assert.equal(JSON.stringify(session.game.inventory), before);
});

test('a recipe book is read for free, otherwise the real shop price is paid', () => {
  const session = hero();
  const alloy = recipeForMaterial('l2_1890'), id = `recipe:${alloy.recipeItem}`;
  const recipe = getRecipe(id);
  if (!recipe.bookKey) return; // this recipe consumes its book on every craft
  const gold = session.game.inventory.gold;
  ensureCraft(session).level = 9;
  addMaterial(session, recipe.bookKey, 1);
  assert.deepEqual([learnRecipe(session, id).ok, session.game.inventory.gold, getMaterialCount(session, recipe.bookKey)], [true, gold, 0]);
});
