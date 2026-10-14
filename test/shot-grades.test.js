import test from 'node:test';
import assert from 'node:assert/strict';
import {SHOT_CHARGE_GRADES, SHOT_PACK_PRICE, SHOTS_PER_CAST, chargeGrade, shotKey} from '../template/shotsData.js';
import materials from '../template/materialsTemplate.js';
import shop from '../template/shopTemplate.js';
import {migrateShotGrades} from '../functions/game/shots/migrateShotGrades.js';

test('shots exist only up to S; S80 and S84 weapons use S charges', () => {
  assert.deepEqual([...SHOT_CHARGE_GRADES], ['noGrade', 'D', 'C', 'B', 'A', 'S']);
  assert.equal(chargeGrade('S80'), 'S');
  assert.equal(chargeGrade('S84'), 'S');
  assert.equal(shotKey('soulshot', 'S84'), 'soulshot_S');
  assert.equal(shotKey('blessed', 'S80'), 'blessedshot_S');
  assert.deepEqual(Object.keys(SHOT_PACK_PRICE), [...SHOT_CHARGE_GRADES]);
  assert.deepEqual(Object.keys(SHOTS_PER_CAST), [...SHOT_CHARGE_GRADES]);
  assert.equal(materials.some(m => /shot_S(80|84)$/.test(m.key)), false);
  assert.equal(shop.some(i => /^shot-.*-S(80|84)$/.test(i.command)), false);
});

test('stored S80/S84 charges are merged into S exactly once', () => {
  const session = {game: {
    inventory: {materials: {soulshot_S: 5, soulshot_S80: 10, spiritshot_S84: 7, blessedshot_S80: 0}},
    warehouse: {materials: {soulshot_S84: 3}},
    mailbox: [{rewards: [{materials: {soulshot_S80: 2}}, {key: 'spiritshot_S84', amount: 4}]}],
  }};
  assert.equal(migrateShotGrades(session), true);
  assert.deepEqual(session.game.inventory.materials, {soulshot_S: 15, spiritshot_S: 7});
  assert.deepEqual(session.game.warehouse.materials, {soulshot_S: 3});
  assert.deepEqual(session.game.mailbox[0].rewards, [{materials: {soulshot_S: 2}}, {key: 'spiritshot_S', amount: 4}]);
  assert.equal(migrateShotGrades(session), false);
});
