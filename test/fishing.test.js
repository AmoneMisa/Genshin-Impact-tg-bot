import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import {addMaterial, getMaterialCount} from '../functions/game/player/materials.js';
import {
  FISHING, bestRod, castMs, castOnce, fishLevelFor, getFishingState, openFish, pickFish, rodKey, setAuto, settleFishing,
} from '../functions/game/fishing/fishing.js';
import FISHING_DATA from '../template/fishingData.js';
import {performFishingAction} from '../miniapp/fishing.js';
import craftItem, {getRecipe, visibleRecipes, ensureCraft} from '../functions/game/equipment/craftItem.js';
import {hennaOfDye} from '../functions/game/player/tattoos.js';
import {allRecipes, splitIngredients} from '../functions/game/equipment/realRecipes.js';
import {buyEntry, merchantStock} from '../functions/game/shop/merchants.js';

const NOW = Date.UTC(2026, 9, 12, 10, 0, 0);
const hero = (className = 'phoenixKnight', level = 80) => {
  const session = {userId: 1, userChatData: {user: {id: 1}}, game: {stats: {lvl: level, currentExp: 0}, inventory: {gold: 1e9, ancientAdena: 0, materials: {}, equipment: {items: []}, potions: {items: []}}, equipmentStats: {}, effects: [], builds: {}, respawnTime: 0}};
  changeClass(session, className);
  updateStats(session);
  return session;
};
const rod = (name) => FISHING_DATA.rods.find(entry => entry.name === name);
const give = (session, name) => addMaterial(session, rodKey(rod(name).item), 1);

test('the best usable rod is used; a rod is fast in proportion to its damage', () => {
  const session = hero('phoenixKnight', 55);
  assert.equal(bestRod(session), null);
  give(session, 'Baby Duck Rod');
  give(session, 'Pelican Rod');
  give(session, 'Triton Pole');
  assert.equal(bestRod(session).name, 'Pelican Rod');
  assert.equal(castMs(rod('Baby Duck Rod')), FISHING.castMs);
  assert.ok(castMs(rod('Triton Pole')) < castMs(rod('Albatross Rod')));
  assert.equal(bestRod(hero('phoenixKnight', 85) && (() => { const high = hero('phoenixKnight', 85); give(high, 'Triton Pole'); return high; })()).name, 'Triton Pole');
});

test('fish are caught by level: the top three fish levels of the character', () => {
  assert.deepEqual([20, 40, 80, 85].map(fishLevelFor), [7, 13, 27, 27]);
  for (let roll = 0; roll < 20; roll += 1) {
    const fish = pickFish(40, () => roll / 20);
    assert.ok(fish.level >= 11 && fish.level <= 13, `${fish.name} ${fish.level}`);
    assert.ok(FISHING_DATA.capsules[fish.item], 'only fish with a known capsule are caught');
  }
});

test('manual casts need a rod, wait for the cast time and stop at the daily limit', () => {
  const session = hero();
  assert.equal(castOnce(session, NOW).reason, 'no_rod');
  give(session, 'Triton Pole');
  const first = castOnce(session, NOW, () => 0.5);
  assert.equal(first.ok, true);
  assert.equal(first.caught.length, 1);
  assert.equal(session.game.fishing.casts, 1);
  const soon = castOnce(session, NOW + 1000);
  assert.deepEqual([soon.ok, soon.reason], [false, 'not_ready']);
  assert.equal(castOnce(session, NOW + castMs(rod('Triton Pole')), () => 0.5).ok, true);
  session.game.fishing.casts = FISHING.dailyCasts;
  assert.equal(castOnce(session, NOW + 10 * castMs(rod('Triton Pole'))).reason, 'daily_limit');
  // the next day starts again
  assert.equal(castOnce(session, NOW + 24 * 3600 * 1000, () => 0.5).ok, true);
  assert.equal(session.game.fishing.casts, 1);
});

test('auto fishing settles the casts that fell due, never more than the daily limit', () => {
  const session = hero();
  give(session, 'Triton Pole');
  const step = castMs(rod('Triton Pole'));
  assert.equal(setAuto(session, true, NOW).ok, true);
  assert.deepEqual(settleFishing(session, NOW + step - 1), []);
  const caught = settleFishing(session, NOW + step * 10 + 5, () => 0.5);
  assert.equal(caught.reduce((sum, row) => sum + row.amount, 0), 10);
  assert.equal(session.game.fishing.casts, 10);
  // a very long absence is capped by the day: 120 casts at most
  const later = settleFishing(session, NOW + 3 * 3600 * 1000, () => 0.5);
  assert.equal(later.reduce((sum, row) => sum + row.amount, 0), FISHING.dailyCasts - 10);
  assert.equal(session.game.fishing.casts, FISHING.dailyCasts);
  assert.deepEqual(settleFishing(session, NOW + 4 * 3600 * 1000), []);
  assert.equal(getFishingState(session, NOW + 4 * 3600 * 1000).remaining, 0);
  // no rod: auto switches itself off
  const bare = hero();
  assert.equal(setAuto(bare, true, NOW).reason, 'no_rod');
});

test('opening a fish gives one of its real products by chance; some fish give nothing', () => {
  const session = hero();
  const fish = FISHING_DATA.fish.find(entry => FISHING_DATA.capsules[entry.item]);
  const products = FISHING_DATA.capsules[fish.item];
  addMaterial(session, `l2_${fish.item}`, 3);
  const first = openFish(session, fish.item, 1, () => 0);
  assert.equal(first.ok, true);
  assert.equal(first.opened, 1);
  assert.equal(getMaterialCount(session, `l2_${products[0][0]}`), products[0][1]);
  assert.equal(getMaterialCount(session, `l2_${fish.item}`), 2);
  const nothing = openFish(session, fish.item, 'all', () => 0.9999);
  assert.deepEqual([nothing.opened, nothing.empty, nothing.items.length], [2, 2, 0]);
  assert.equal(openFish(session, fish.item).reason, 'no_fish');
  assert.equal(openFish(session, 1).reason, 'not_a_fish');
});

test('the mini app actions return the screen state and settle first', () => {
  const session = hero();
  give(session, 'Triton Pole');
  const started = performFishingAction(session, 'auto', {enabled: true}, NOW);
  assert.equal(started.ok, true);
  assert.equal(started.fishing.auto, true);
  const later = performFishingAction(session, 'state', {}, NOW + 5 * castMs(rod('Triton Pole')) + 1);
  assert.ok(later.fishing.casts >= 5);
  assert.equal(performFishingAction(session, 'nope').reason, 'unknown_action');
});

test('the fisherman sells the rods and the dye recipes at real prices; rods ask for their level', () => {
  const stock = merchantStock().fisher;
  const baby = stock.find(entry => entry.name === 'Baby Duck Rod');
  assert.equal(baby.cost.gold, Math.round(30000 * 0.25));
  assert.equal(stock.filter(entry => entry.group === 'recipe').length, FISHING_DATA.recipes.length);
  const low = hero('phoenixKnight', 10);
  assert.equal(buyEntry(low, 'fisher', baby.id).reason, 'level_too_low');
  const player = hero('phoenixKnight', 30);
  assert.equal(buyEntry(player, 'fisher', baby.id).ok, true);
  assert.equal(bestRod(player).name, 'Baby Duck Rod');
});

test('dyes are crafted from real recipes by the 2nd profession only', () => {
  const recipe = allRecipes().find(entry => hennaOfDye(entry.product)?.name === 'Greater Dye of STR (Str+4 Con-4)');
  const id = `recipe:${recipe.recipeItem}`;
  const row = getRecipe(id);
  assert.equal(row.dye, true);
  assert.equal(row.minTier, 3);
  assert.equal(row.successRate, 1);
  const stock = session => { for (const [key, need] of Object.entries(splitIngredients(recipe).materials)) addMaterial(session, key, need); ensureCraft(session).level = 9; };

  const base = hero('warrior', 85);
  stock(base);
  const before = JSON.stringify(base.game.inventory);
  assert.equal(craftItem(base, id).reason, 'profession_too_low');
  assert.equal(JSON.stringify(base.game.inventory), before);
  assert.equal(visibleRecipes(base).some(entry => entry.dye), false);

  const master = hero('phoenixKnight', 85);
  stock(master);
  assert.ok(visibleRecipes(master).filter(entry => entry.dye).length >= 60);
  const result = craftItem(master, id, {random: () => 0});
  assert.equal(result.ok, true);
  assert.equal(result.success, true);
  assert.equal(getMaterialCount(master, `l2_${recipe.product}`), 1);
});
