import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import {addMaterial, getMaterialCount} from '../functions/game/player/materials.js';
import {
  FISHING, bestRod, castMs, castOnce, fishLevelFor, getFishingState, openFish, pickFish, rodKey, setAuto, settleFishing, shotKey, ROD_GRADES,
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
const bestRodGrade = name => ROD_GRADES[FISHING_DATA.rods.findIndex(entry => entry.name === name)];

test('rods have grades, the best usable one is used and a rod is fast in proportion to its damage', () => {
  const session = hero('phoenixKnight', 55);
  assert.equal(bestRod(session), null);
  give(session, 'Baby Duck Rod');
  give(session, 'Pelican Rod');
  give(session, 'Triton Pole');
  assert.equal(bestRod(session).name, 'Pelican Rod');
  assert.deepEqual(['Baby Duck Rod', 'Albatross Rod', 'Pelican Rod', 'KingFisher Rod', 'Cygnus Pole', 'Triton Pole'].map(name => bestRodGrade(name)), ['noGrade', 'D', 'C', 'B', 'A', 'S']);
  assert.equal(castMs(rod('Baby Duck Rod')), FISHING.castMs);
  assert.ok(castMs(rod('Triton Pole')) < castMs(rod('Albatross Rod')));
  assert.ok(Math.abs(castMs(rod('Triton Pole'), true) - castMs(rod('Triton Pole')) / 2) <= 1);
  const high = hero('phoenixKnight', 85);
  give(high, 'Triton Pole');
  assert.equal(bestRod(high).name, 'Triton Pole');
});

test('daily fish by grade: 500 for an S rod, 220 for A, and fewer below', () => {
  assert.deepEqual(FISHING.dailyFish, {noGrade: 50, D: 80, C: 110, B: 160, A: 220, S: 500});
  const session = hero();
  give(session, 'Triton Pole');
  assert.equal(getFishingState(session, NOW).limit, 500);
  const archer = hero();
  give(archer, 'Cygnus Pole');
  assert.equal(getFishingState(archer, NOW).limit, 220);
});

test('fish are caught by level: the top three fish levels of the character', () => {
  assert.deepEqual([20, 40, 80, 85].map(fishLevelFor), [7, 13, 27, 27]);
  for (let roll = 0; roll < 20; roll += 1) {
    const fish = pickFish(40, () => roll / 20);
    assert.ok(fish.level >= 11 && fish.level <= 13, `${fish.name} ${fish.level}`);
    assert.ok(FISHING_DATA.capsules[fish.item], 'only fish with a known capsule are caught');
  }
});

test('a manual cast needs a rod, burns a shot of the rod grade and waits for the cast time', () => {
  const session = hero();
  assert.equal(castOnce(session, NOW).reason, 'no_rod');
  give(session, 'Triton Pole');
  addMaterial(session, shotKey('S'), 2);
  const first = castOnce(session, NOW, () => 0.5);
  assert.equal(first.ok, true);
  assert.equal(first.shotsSpent, 1);
  assert.equal(getMaterialCount(session, shotKey('S')), 1);
  assert.equal(first.caught.length, 1);
  assert.equal(session.game.fishing.fish, 1);
  // with a shot the next cast is ready in half the time
  assert.equal(castOnce(session, NOW + 1000).reason, 'not_ready');
  const quick = castMs(rod('Triton Pole'), true);
  assert.equal(castOnce(session, NOW + quick, () => 0.5).ok, true);
  assert.equal(getMaterialCount(session, shotKey('S')), 0);
  // out of shots: the slow time
  assert.equal(castOnce(session, NOW + quick + quick, () => 0.5).reason, 'not_ready');
  assert.equal(castOnce(session, NOW + quick + castMs(rod('Triton Pole')), () => 0.5).ok, true);
  // shots switched off are kept
  addMaterial(session, shotKey('S'), 5);
  performFishingAction(session, 'shots', {enabled: false}, NOW + 100000);
  castOnce(session, NOW + 200000, () => 0.5);
  assert.equal(getMaterialCount(session, shotKey('S')), 5);
});

test('past the daily fish a cast catches by a very low chance and burns no shot', () => {
  const session = hero();
  give(session, 'Cygnus Pole');
  addMaterial(session, shotKey('A'), 10);
  getFishingState(session, NOW);
  session.game.fishing.fish = 220;
  const miss = castOnce(session, NOW, () => 0.5);
  assert.equal(miss.ok, true);
  assert.equal(miss.caught.length, 0);
  assert.equal(miss.over, true);
  assert.equal(getMaterialCount(session, shotKey('A')), 10);
  assert.equal(session.game.fishing.fish, 220);
  const lucky = castOnce(session, NOW + castMs(rod('Cygnus Pole')), () => 0);
  assert.equal(lucky.caught.length, 1);
  assert.equal(session.game.fishing.fish, 221);
  assert.equal(FISHING.overLimitChance, 0.005);
  assert.equal(getFishingState(session, NOW + 1000).overLimit, true);
  // the next day the daily fish are available again
  const next = castOnce(session, NOW + 24 * 3600 * 1000, () => 0.5);
  assert.equal(next.caught.length, 1);
  assert.equal(session.game.fishing.fish, 1);
});

test('auto fishing settles the casts that fell due, quicker with shots, and slows down to the limit', () => {
  const session = hero();
  give(session, 'Triton Pole');
  const slow = castMs(rod('Triton Pole')), quick = castMs(rod('Triton Pole'), true);
  addMaterial(session, shotKey('S'), 4);
  assert.equal(setAuto(session, true, NOW).ok, true);
  assert.deepEqual(settleFishing(session, NOW + quick - 1), []);
  // four quick casts burn the four shots, then the slow time is used
  const caught = settleFishing(session, NOW + quick * 4 + slow * 2 + 5, () => 0.5);
  assert.equal(caught.reduce((sum, row) => sum + row.amount, 0), 6);
  assert.equal(getMaterialCount(session, shotKey('S')), 0);
  // a long absence never gives more than the 500 fish of the day at a normal chance
  const later = settleFishing(session, NOW + 11 * 3600 * 1000, () => 0.5);
  const total = later.reduce((sum, row) => sum + row.amount, 0);
  assert.equal(session.game.fishing.fish, 500);
  assert.equal(total, 500 - 6);
  // the day after, the 12 hours of absence are fished again from the first fish
  assert.ok(settleFishing(session, NOW + 40 * 3600 * 1000, () => 0.5).length > 0);
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
  assert.ok(later.fishing.fishToday >= 5);
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
