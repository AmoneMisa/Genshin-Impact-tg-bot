import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlayerProfileState, changePlayerClassForMiniApp, changePlayerGenderForMiniApp } from '../miniapp/playerProfile.js';

function session() {
  return {
    gender: 'male',
    changeClassTimer: 0,
    game: {
      stats: { lvl: 20 },
      gameClass: {
        stats: {
          name: 'noClass',
          translateName: 'Бродяжка',
          attack: 1,
          defence: 1,
          maxHp: 1000,
          maxMp: 200,
          maxCp: 200,
        },
        skills: [],
      },
      effects: [],
    },
  };
}

test('profile exposes four selectable combat classes and current gender', () => {
  const state = getPlayerProfileState(session(), 1000);
  assert.equal(state.gender, 'male');
  assert.equal(state.currentClass.name, 'noClass');
  assert.equal(state.classChangeRemainingMs, 0);
  assert.deepEqual(state.classes.map(item => item.name), ['warrior', 'mage', 'priest', 'archer']);
  assert.ok(state.classes.every(item => item.stats.maxHp > 0));
});

test('first class choice is allowed immediately and starts weekly cooldown', () => {
  const player = session();
  player.changeClassTimer = 999999999;
  const result = changePlayerClassForMiniApp(player, 'mage', 1000);

  assert.equal(result.ok, true);
  assert.equal(player.game.gameClass.stats.name, 'mage');
  assert.equal(result.profile.currentClass.name, 'mage');
  assert.equal(result.profile.classChangeRemainingMs, 7 * 24 * 60 * 60 * 1000);
});

test('class change rejects same class and active cooldown', () => {
  const player = session();
  assert.equal(changePlayerClassForMiniApp(player, 'warrior', 1000).ok, true);
  assert.equal(changePlayerClassForMiniApp(player, 'warrior', 1001).reason, 'same_class');

  const blocked = changePlayerClassForMiniApp(player, 'archer', 1001);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'class_cooldown');
  assert.ok(blocked.cooldownRemainingMs > 0);
});

test('class can be changed after the weekly cooldown', () => {
  const player = session();
  const start = 1000;
  changePlayerClassForMiniApp(player, 'warrior', start);
  const result = changePlayerClassForMiniApp(player, 'priest', start + 7 * 24 * 60 * 60 * 1000 + 1);

  assert.equal(result.ok, true);
  assert.equal(player.game.gameClass.stats.name, 'priest');
});

test('gender accepts only legacy male/female values', () => {
  const player = session();
  assert.equal(changePlayerGenderForMiniApp(player, 'female', 1000).ok, true);
  assert.equal(player.gender, 'female');
  assert.equal(changePlayerGenderForMiniApp(player, 'other', 1000).reason, 'unknown_gender');
  assert.equal(player.gender, 'female');
});
