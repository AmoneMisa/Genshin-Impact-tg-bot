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

test('profile exposes the eleven start classes of the real tree and current gender', () => {
  const state = getPlayerProfileState(session(), 1000);
  assert.equal(state.gender, 'male');
  assert.equal(state.currentClass.name, 'noClass');
  assert.equal(state.classChangeRemainingMs, 0);
  assert.deepEqual(state.classes.map(item => item.name), ['humanFighter', 'humanMystic', 'elvenFighter', 'elvenMystic', 'darkFighter', 'darkMystic', 'orcFighter', 'orcMystic', 'dwarvenFighter', 'maleSoldier', 'femaleSoldier']);
  assert.ok(state.classes.every(item => item.stats.maxHp > 0));
});

test('first class choice is allowed immediately and starts weekly cooldown', () => {
  const player = session();
  player.changeClassTimer = 999999999;
  const result = changePlayerClassForMiniApp(player, 'humanMystic', 1000);

  assert.equal(result.ok, true);
  assert.equal(player.game.gameClass.stats.name, 'humanMystic');
  assert.equal(result.profile.currentClass.name, 'humanMystic');
  assert.equal(result.profile.classChangeRemainingMs, 7 * 24 * 60 * 60 * 1000);
});

test('class change rejects same class and active cooldown', () => {
  const player = session();
  assert.equal(changePlayerClassForMiniApp(player, 'humanFighter', 1000).ok, true);
  assert.equal(changePlayerClassForMiniApp(player, 'humanFighter', 1001).reason, 'same_class');

  const blocked = changePlayerClassForMiniApp(player, 'elvenFighter', 1001);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'class_cooldown');
  assert.ok(blocked.cooldownRemainingMs > 0);
});

test('class can be changed after the weekly cooldown', () => {
  const player = session();
  const start = 1000;
  changePlayerClassForMiniApp(player, 'humanFighter', start);
  const result = changePlayerClassForMiniApp(player, 'darkMystic', start + 7 * 24 * 60 * 60 * 1000 + 1);

  assert.equal(result.ok, true);
  assert.equal(player.game.gameClass.stats.name, 'darkMystic');
});

test('gender accepts only legacy male/female values', () => {
  const player = session();
  assert.equal(changePlayerGenderForMiniApp(player, 'female', 1000).ok, true);
  assert.equal(player.gender, 'female');
  assert.equal(changePlayerGenderForMiniApp(player, 'other', 1000).reason, 'unknown_gender');
  assert.equal(player.gender, 'female');
});

test('professions are earned by quest, never picked from the class list', () => {
  const player = session();
  assert.equal(changePlayerClassForMiniApp(player, 'humanKnight', 1000).reason, 'unknown_class');
  assert.equal(changePlayerClassForMiniApp(player, 'titan', 1000).reason, 'unknown_class');
});

test('switching to another base class drops a running profession quest but keeps earned ones', () => {
  const player = session();
  changePlayerClassForMiniApp(player, 'humanFighter', 1000);
  player.game.classQuest = { active: { to: 'humanKnight', progress: {} }, completed: ['warriorProf'] };
  const result = changePlayerClassForMiniApp(player, 'humanMystic', 1000 + 8 * 24 * 60 * 60 * 1000);
  assert.equal(result.ok, true);
  assert.equal(player.game.classQuest.active, null);
  assert.deepEqual(player.game.classQuest.completed, ['warriorProf']);
});
