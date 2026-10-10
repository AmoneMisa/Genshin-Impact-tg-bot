import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import {addMaterial, getMaterialCount} from '../functions/game/player/materials.js';
import {statTotal, baseStatsOf} from '../functions/game/player/baseStats.js';
import {HUNT} from '../functions/game/hunt/huntConfig.js';
import {
  applyTattoo, removeTattoo, getTattooState, slotCount, symbolTotals, allHennas, dyeKey, hennaOfDye, TATTOO_BONUS_CAP,
} from '../functions/game/player/tattoos.js';
import {performTattooAction} from '../miniapp/tattoos.js';

const hero = (className = 'phoenixKnight', level = 80, gold = 1e9) => {
  const session = {userId: 1, userChatData: {user: {id: 1}}, game: {stats: {lvl: level, currentExp: 0}, inventory: {gold, materials: {}, equipment: {items: []}, potions: {items: []}}, equipmentStats: {}, effects: [], builds: {}, respawnTime: 0}};
  changeClass(session, className);
  updateStats(session);
  return session;
};
const dye = (predicate) => allHennas().find(predicate);
const stock = (session, henna, extra = 0) => addMaterial(session, dyeKey(henna.dye), henna.wear[0] + extra);

test('the data is the real High Five list: 180 symbols, ten dyes to draw, five come back', () => {
  assert.equal(allHennas().length, 180);
  const greater = dye(henna => henna.name === 'Greater Dye of STR (Str+4 Con-4)');
  assert.deepEqual([greater.stats, greater.wear, greater.cancel], [{STR: 4, CON: -4}, [10, 628000], [5, 125600]]);
});

test('the Symbol Maker asks for the 2nd profession (tier 3); then there are three slots', () => {
  assert.deepEqual(['warrior', 'crusader', 'phoenixKnight', 'mage', 'elementalist', 'archmage'].map(name => slotCount(hero(name, 85))), [0, 0, 3, 0, 0, 3]);
  const base = hero('warrior', 85);
  const before = JSON.stringify(base.game);
  assert.deepEqual([applyTattoo(base, 4445).reason, JSON.stringify(base.game)], ['profession_too_low', before]);
  assert.equal(getTattooState(base).tierOk, false);
  assert.equal(getTattooState(base).needLevel, 40);
  assert.equal(getTattooState(hero('archmage', 85)).tierOk, true);
  const first = hero('crusader', 85);
  assert.equal(applyTattoo(first, 4445).reason, 'profession_too_low');
});

test('a symbol takes the dyes and the real adena fee and changes the characteristics', () => {
  const session = hero('phoenixKnight', 80);
  const henna = dye(item => item.who.includes('fighter') && item.stats.STR === 2 && item.level <= 80);
  const base = statTotal(session, 'STR'), gold = session.game.inventory.gold;
  assert.equal(applyTattoo(session, henna.dye).reason, 'not_enough_dyes');
  stock(session, henna, 3);
  const result = applyTattoo(session, henna.dye);
  assert.equal(result.ok, true);
  assert.equal(getMaterialCount(session, dyeKey(henna.dye)), 3);
  assert.equal(session.game.inventory.gold, gold - Math.max(1, Math.round(henna.wear[1] * HUNT.goldScale)));
  assert.equal(statTotal(session, 'STR'), Math.max(1, Math.round((base + 2) * 10) / 10));
  const loss = Object.entries(henna.stats).find(([, value]) => value < 0);
  assert.equal(statTotal(session, loss[0]), Math.max(1, Math.round((baseStatsOf(session)[loss[0]] + loss[1]) * 10) / 10));
});

test('erasing returns five dyes for the fee; level, class and gold are checked first', () => {
  const session = hero('phoenixKnight', 80);
  const henna = dye(item => item.who.includes('fighter') && item.level <= 80 && item.stats.DEX > 0);
  stock(session, henna);
  assert.equal(applyTattoo(session, henna.dye).ok, true);
  const gold = session.game.inventory.gold;
  const erased = removeTattoo(session, 0);
  assert.deepEqual([erased.ok, erased.returned, getMaterialCount(session, dyeKey(henna.dye))], [true, henna.cancel[0], henna.cancel[0]]);
  assert.equal(session.game.inventory.gold, gold - Math.max(1, Math.round(henna.cancel[1] * HUNT.goldScale)));
  assert.equal(removeTattoo(session, 0).reason, 'no_such_symbol');

  const mageOnly = dye(item => item.who.length === 1 && item.who[0] === 'mage');
  const warrior = hero('phoenixKnight', 80);
  stock(warrior, mageOnly);
  assert.equal(applyTattoo(warrior, mageOnly.dye).reason, 'class_cannot_use');
  const mage = hero('archmage', 80);
  stock(mage, mageOnly);
  assert.equal(applyTattoo(mage, mageOnly.dye).ok, true);

  const high = dye(item => item.level >= 50 && item.who.includes('fighter'));
  const low = hero('phoenixKnight', 40);
  stock(low, high);
  assert.equal(applyTattoo(low, high.dye).reason, 'level_too_low');
  const poor = hero('phoenixKnight', 80, 0);
  stock(poor, high);
  const before = JSON.stringify(poor.game);
  assert.deepEqual([applyTattoo(poor, high.dye).reason, JSON.stringify(poor.game)], ['not_enough_gold', before]);
});

test('gains stop at +5 per characteristic, losses always count', () => {
  const same = allHennas().find(item => item.stats.STR === 4);
  assert.equal(symbolTotals([same.dye, same.dye]).STR, TATTOO_BONUS_CAP);
  const losing = allHennas().find(item => item.stats.CON === -4);
  assert.equal(symbolTotals([losing.dye, losing.dye]).CON, -8);
  assert.deepEqual(hennaOfDye(same.dye).who.includes('fighter'), true);
});

test('the screen state is paged and filtered, and the mini app actions return it', () => {
  const session = hero('archmage', 80);
  const all = getTattooState(session, {usable: false});
  assert.equal(all.total, 180);
  assert.equal(all.dyes.length, 8);
  assert.equal(all.pages, 23);
  const int = getTattooState(session, {stat: 'INT', page: 2});
  assert.ok(int.dyes.every(item => item.stats.INT > 0));
  assert.equal(int.page, 2);
  const clamped = getTattooState(session, {page: 999});
  assert.equal(clamped.page, clamped.pages);
  const henna = dye(item => item.who.includes('mage') && item.level <= 80);
  stock(session, henna);
  const owned = getTattooState(session, {owned: true});
  assert.deepEqual(owned.dyes.map(item => item.dye), [henna.dye]);
  const done = performTattooAction(session, 'apply', {dye: henna.dye});
  assert.equal(done.ok, true);
  assert.equal(done.tattoos.worn.length, 1);
  assert.equal(performTattooAction(session, 'nonsense').reason, 'unknown_action');
  assert.equal(performTattooAction(session, 'list', {page: 2}).tattoos.page, 2);
});
