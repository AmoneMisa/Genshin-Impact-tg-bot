import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import {getMaterialCount, addMaterial} from '../functions/game/player/materials.js';
import {buyEntry, findEntry, merchantStock, MERCHANTS} from '../functions/game/shop/merchants.js';
import {buyFromMerchant, getMerchantsState} from '../miniapp/merchants.js';
import {HUNT} from '../functions/game/hunt/huntConfig.js';

const hero = (className = 'warrior', level = 85, inventory = {}) => {
  const session = {userId: 1, userChatData: {user: {id: 1}}, game: {stats: {lvl: level, currentExp: 0}, inventory: {gold: 1e9, ancientAdena: 1e9, materials: {}, equipment: {items: []}, potions: {items: []}, ...inventory}, equipmentStats: {}, effects: [], builds: {}, respawnTime: 0}};
  changeClass(session, className);
  updateStats(session);
  return session;
};

test('town merchants sell the catalog items of no grade, D and C at the real prices on the gold scale', () => {
  const stock = merchantStock();
  assert.deepEqual(MERCHANTS.map(merchant => merchant.id), ['weapons', 'armor', 'jewelry', 'alchemist', 'mammon']);
  assert.ok(stock.weapons.length >= 20 && stock.armor.length >= 40 && stock.jewelry.length >= 6);
  for (const entry of [...stock.weapons, ...stock.armor, ...stock.jewelry].filter(entry => entry.kind === 'equipment')) assert.ok(['noGrade', 'D', 'C'].includes(entry.grade), entry.name);
  // Club costs 590 adena in High Five
  const club = stock.weapons.find(entry => entry.name === 'Club');
  assert.equal(club.cost.gold, Math.max(Math.round(590 * HUNT.goldScale), 200));
  assert.equal(findEntry('weapons', club.id), club);
});

test('buying equipment gives a catalog item and takes adena; level and class are checked first', () => {
  const warrior = hero('warrior', 85);
  const sword = merchantStock().weapons.find(entry => entry.name === 'Elven Long Sword');
  const gold = warrior.game.inventory.gold;
  const result = buyEntry(warrior, 'weapons', sword.id);
  assert.equal(result.ok, true);
  assert.equal(warrior.game.inventory.gold, gold - sword.cost.gold);
  assert.equal(warrior.game.inventory.equipment.items.at(-1).name, 'Elven Long Sword');

  const novice = hero('warrior', 1);
  const before = JSON.stringify(novice.game.inventory);
  const early = merchantStock().weapons.find(entry => entry.grade === 'C');
  assert.deepEqual([buyEntry(novice, 'weapons', early.id).reason, JSON.stringify(novice.game.inventory)], ['level_too_low', before]);

  // a mage cannot use heavy armor: refused, nothing spent
  const mage = hero('mage', 85);
  const heavy = merchantStock().armor.find(entry => entry.itemId.includes(':heavy:') && entry.grade === 'D');
  const mageBefore = JSON.stringify(mage.game.inventory);
  assert.deepEqual([buyEntry(mage, 'armor', heavy.id).reason, JSON.stringify(mage.game.inventory)], ['class_cannot_use', mageBefore]);
  assert.equal(buyEntry(warrior, 'weapons', 'eq:nothing').reason, 'unknown_item');
});

test('Mammon takes Ancient Adena and Blank Scrolls, nothing is spent when one is missing', () => {
  const stock = merchantStock().mammon;
  const gem = stock.find(entry => entry.name === 'Gemstone S');
  assert.deepEqual(gem.cost, {aa: 100000});
  const scroll = stock.find(entry => entry.key === 'scroll_C');
  assert.deepEqual(scroll.cost, {aa: 110000, materials: {l2_5965: 220}});

  const player = hero('warrior', 85, {ancientAdena: 100000 * 2 + 110000});
  assert.equal(buyEntry(player, 'mammon', gem.id, 2).ok, true);
  assert.equal(getMaterialCount(player, 'craft_gem_S'), 2);
  assert.equal(player.game.inventory.ancientAdena, 110000);

  const before = JSON.stringify(player.game.inventory);
  assert.equal(buyEntry(player, 'mammon', scroll.id).reason, 'not_enough_materials');
  assert.equal(JSON.stringify(player.game.inventory), before);
  addMaterial(player, 'l2_5965', 220);
  assert.equal(buyEntry(player, 'mammon', scroll.id).ok, true);
  assert.deepEqual([getMaterialCount(player, 'scroll_C'), getMaterialCount(player, 'l2_5965'), player.game.inventory.ancientAdena], [1, 0, 0]);
  assert.equal(buyEntry(player, 'mammon', gem.id).reason, 'not_enough_aa');
});

test('SP scrolls give skill points at once; gemstones D/C/B and recipe books are sold for adena', () => {
  const player = hero('warrior', 85, {sp: 0});
  const sp = merchantStock().mammon.find(entry => entry.name === 'SP Scroll (Medium-Grade)');
  assert.equal(buyEntry(player, 'mammon', sp.id).ok, true);
  assert.equal(player.game.inventory.sp, 5000);
  const gemC = merchantStock().alchemist.find(entry => entry.name === 'Gemstone C');
  assert.equal(gemC.cost.gold, Math.round(3000 * HUNT.goldScale));
  assert.equal(buyEntry(player, 'alchemist', gemC.id, 10).ok, true);
  assert.equal(getMaterialCount(player, 'craft_gem_C'), 10);
  const book = merchantStock().alchemist.find(entry => /^Recipe:/.test(entry.name));
  assert.equal(buyEntry(player, 'alchemist', book.id).ok, true);
  assert.equal(getMaterialCount(player, book.key), 1);
  assert.equal(buyEntry(player, 'alchemist', gemC.id, 0).reason, 'invalid_count');
});

test('the screen state lists the merchants and one filtered, paged slice of the chosen one', () => {
  const player = hero('warrior', 85, {gold: 100, ancientAdena: 0});
  const state = getMerchantsState(player, {merchant: 'weapons'});
  assert.deepEqual(state.merchants.map(merchant => merchant.id), ['weapons', 'armor', 'jewelry', 'alchemist', 'mammon']);
  assert.ok(state.merchants.every(merchant => merchant.count > 0));
  assert.equal(state.items.length, 12);
  assert.equal(state.pageSize, 12);
  assert.ok(state.pages >= 2);
  assert.ok(state.items.some(item => item.canPay === false && item.lack === 'not_enough_gold'));
  const result = buyFromMerchant(player, 'weapons', state.items[0].id);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'not_enough_gold');
  assert.equal(result.merchants.merchants.length, 5);
  assert.equal(player.game.inventory.gold, 100);
});

test('filters: grade, kind, search, usable and affordable narrow the page; pages are clamped', () => {
  const player = hero('warrior', 85, {gold: 5000});
  const all = getMerchantsState(player, {merchant: 'armor'});
  const d = getMerchantsState(player, {merchant: 'armor', grade: 'D'});
  assert.ok(d.total > 0 && d.total < all.total);
  assert.ok(d.items.every(item => item.grade === 'D'));
  assert.ok(all.facets.grades.includes('noGrade') && all.facets.groups.some(group => group.id === 'heavy'));
  const heavy = getMerchantsState(player, {merchant: 'armor', group: 'heavy'});
  assert.ok(heavy.total > 0 && heavy.total < all.total);
  const found = getMerchantsState(player, {merchant: 'armor', search: 'brigandine'});
  assert.ok(found.total > 0 && found.items.every(item => /brigandine/i.test(item.name)));
  const cheap = getMerchantsState(player, {merchant: 'armor', affordable: true});
  assert.ok(cheap.items.every(item => item.canPay));
  const mage = hero('mage', 85);
  const usable = getMerchantsState(mage, {merchant: 'armor', usable: true});
  assert.ok(usable.items.every(item => item.canUse));
  assert.ok(usable.total < getMerchantsState(mage, {merchant: 'armor'}).total);
  const last = getMerchantsState(player, {merchant: 'alchemist', page: 9999});
  assert.equal(last.page, last.pages);
  assert.equal(getMerchantsState(player, {merchant: 'nope'}).merchant, 'weapons');
  // the alchemist alone sells well over a hundred goods, never more than a page is sent
  const alchemist = getMerchantsState(player, {merchant: 'alchemist'});
  assert.ok(alchemist.total > 100 && alchemist.items.length === 12);
});

test('arrows and bolts are sold in packs of a hundred at the real price of one', () => {
  const player = hero('archer', 85, {gold: 10000});
  const pack = merchantStock().weapons.find(entry => entry.name === 'Steel Arrow ×100');
  assert.equal(pack.cost.gold, Math.round(5 * 100 * HUNT.goldScale));
  assert.equal(buyEntry(player, 'weapons', pack.id).ok, true);
  assert.equal(getMaterialCount(player, 'l2_1342'), 100);
});

test('a dye row shows the pair of stats of its symbol, the level and the number of dyes', () => {
  const player = hero('warrior', 85, {gold: 1e9});
  const town = getMerchantsState(player, {merchant: 'alchemist', search: 'Dye of STR (Str+1 Con-3)'}).items[0];
  assert.deepEqual(town.symbol, {stats: {STR: 1, CON: -3}, level: 28, dyes: 10});
  const mammon = getMerchantsState(player, {merchant: 'mammon', group: 'dye', search: 'Greater Dye of STR (Str+4 Con-4)'}).items[0];
  assert.deepEqual(mammon.symbol.stats, {STR: 4, CON: -4});
  assert.equal(mammon.cost.aa, 174000);
  assert.equal(getMerchantsState(player, {merchant: 'weapons'}).items[0].symbol, null);
});
