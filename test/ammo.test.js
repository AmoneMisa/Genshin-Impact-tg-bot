import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import isPlayerCanUseSkill from '../functions/game/player/isPlayerCanUseSkill.js';
import {findCatalogItem, instantiate} from '../functions/game/equipment/catalog.js';
import {addMaterial, getMaterialCount} from '../functions/game/player/materials.js';
import {
  AMMO_IDS, STARTER_AMMO, ammoKey, convertAmmo, getAmmoState, grantStarterAmmo, hasAmmo, needsAmmo, spendAmmo, wornAmmo,
} from '../functions/game/shots/ammo.js';
import {convertAmmunition, getMerchantsState} from '../miniapp/merchants.js';
import {skillDto} from '../miniapp/boss.js';

const archer = (weaponId = 'D:weapon:bow') => {
  const session = {userId: 1, userChatData: {user: {id: 1}}, game: {stats: {lvl: 80, currentExp: 0}, inventory: {gold: 1e6, materials: {}, equipment: {items: []}, potions: {items: []}}, equipmentStats: {}, effects: [], builds: {}, respawnTime: 0}};
  changeClass(session, 'archer');
  updateStats(session);
  if (weaponId) session.game.equipmentStats.rightHand = {...instantiate(findCatalogItem(weaponId)), isUsed: true};
  session.game.ammoStarter = true; // tests that count arrows must not receive the starting stock
  return session;
};
const damage = {name: 'Shot', isDealDamage: true, cooldown: 0, cost: 0, needLvl: 1};
const buff = {name: 'Focus', isBuff: true, cooldown: 0, cost: 0, needLvl: 1};

test('a bow burns arrows and a crossbow bolts of the weapon grade (S80 and S84 use S ammunition)', () => {
  assert.deepEqual(wornAmmo(archer('D:weapon:bow')), {kind: 'arrow', grade: 'D', key: `l2_${AMMO_IDS.arrow.D}`});
  assert.deepEqual(wornAmmo(archer('C:weapon:crossbow')), {kind: 'bolt', grade: 'C', key: `l2_${AMMO_IDS.bolt.C}`});
  assert.equal(wornAmmo(archer('S84:weapon:bow')).grade, 'S');
  assert.equal(wornAmmo(archer('D:weapon:dagger')), null);
  assert.equal(wornAmmo(archer(null)), null);
});

test('only damage skills of a bow or crossbow need ammunition and spend one piece each', () => {
  const session = archer();
  assert.equal(needsAmmo(session, damage), true);
  assert.equal(needsAmmo(session, buff), false);
  assert.equal(hasAmmo(session, damage), false);
  assert.equal(hasAmmo(session, buff), true);
  addMaterial(session, wornAmmo(session).key, 2);
  assert.equal(hasAmmo(session, damage), true);
  assert.deepEqual(spendAmmo(session, damage), {key: wornAmmo(session).key, kind: 'arrow', amount: 1});
  assert.equal(getMaterialCount(session, wornAmmo(session).key), 1);
  assert.equal(spendAmmo(session, buff), null);
  assert.equal(getMaterialCount(session, wornAmmo(session).key), 1);
  assert.equal(getAmmoState(session).count, 1);
  const sword = archer('D:weapon:oneHandedSword');
  assert.equal(hasAmmo(sword, damage), true);
  assert.equal(spendAmmo(sword, damage), null);
});

test('without ammunition the skill cannot be used (code 4) and the skill card is disabled', () => {
  const session = archer();
  assert.equal(isPlayerCanUseSkill(session, damage), 4);
  assert.equal(skillDto(session, damage, 0).canUse, false);
  addMaterial(session, wornAmmo(session).key, 1);
  assert.equal(isPlayerCanUseSkill(session, damage), 0);
  assert.equal(skillDto(session, damage, 0).canUse, true);
});

test('a character who has never owned ammunition gets a starting stock once', () => {
  const session = archer();
  session.game.ammoStarter = false;
  assert.equal(hasAmmo(session, damage), true);
  assert.equal(getMaterialCount(session, wornAmmo(session).key), STARTER_AMMO);
  spendAmmo(session, damage);
  assert.equal(grantStarterAmmo(session), false);
  assert.equal(getMaterialCount(session, wornAmmo(session).key), STARTER_AMMO - 1);
});

test('arrows and bolts of a grade swap one for one and nothing is spent on a failed swap', () => {
  const session = archer();
  addMaterial(session, ammoKey('arrow', 'S'), 100);
  assert.deepEqual(convertAmmo(session, {from: 'arrow', grade: 'S', count: 60}), {ok: true, from: 'arrow', to: 'bolt', grade: 'S', count: 60, key: ammoKey('bolt', 'S')});
  assert.deepEqual([getMaterialCount(session, ammoKey('arrow', 'S')), getMaterialCount(session, ammoKey('bolt', 'S'))], [40, 60]);
  const before = JSON.stringify(session.game.inventory);
  assert.equal(convertAmmo(session, {from: 'arrow', grade: 'S', count: 41}).reason, 'not_enough_ammo');
  assert.equal(convertAmmo(session, {from: 'bolt', grade: 'X', count: 1}).reason, 'invalid_grade');
  assert.equal(convertAmmo(session, {from: 'stone', grade: 'S', count: 1}).reason, 'invalid_kind');
  assert.equal(convertAmmo(session, {from: 'arrow', grade: 'S', count: 0}).reason, 'invalid_count');
  assert.equal(JSON.stringify(session.game.inventory), before);
  const back = convertAmmunition(session, {from: 'bolt', grade: 'S', count: 60});
  assert.equal(back.ok, true);
  assert.equal(back.merchants.convert.find(row => row.grade === 'S').arrows, 100);
  assert.equal(getMerchantsState(session).ammo.name, 'Bone Arrow');
});
