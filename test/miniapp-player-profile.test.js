import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlayerProfileState, changePlayerClassForMiniApp, changePlayerGenderForMiniApp } from '../miniapp/playerProfile.js';
import {getCharacterState} from '../miniapp/character.js';
import {L2_CLASS_META} from '../template/l2ClassMeta.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';

function session() {
  return {
    gender: 'male',
    changeClassTimer: 0,
    game: {
      stats: { lvl: 20 },
      inventory:{luckCoins:100},
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

test('profession branches preserve every original parent and promotion level', () => {
  const state = getPlayerProfileState(session());
  const seen = new Set();
  function visit(node, parent = null) {
    const [,meta] = Object.entries(L2_CLASS_META).find(([,entry])=>entry.key===node.name);
    assert.equal(meta.parent, parent);
    assert.equal(node.level, [1,20,40,76][meta.level]);
    assert.equal(node.title, meta.ru);
    assert.equal(seen.has(node.name), false);
    seen.add(node.name);
    const id = Number(Object.keys(L2_CLASS_META).find(id=>L2_CLASS_META[id].key===node.name));
    for (const child of node.children) visit(child,id);
  }
  state.classes.forEach(item=>visit(item.professions));
  assert.equal(seen.size,Object.keys(L2_CLASS_META).length);
});

test('service current stats match the character window, including critical rating', () => {
  const player = session();
  changePlayerClassForMiniApp(player,'humanFighter');
  player.game.equipmentStats = {attack:15,defence:10,speed:3,criticalChance:2};
  const character = getCharacterState(player);
  const profile = getPlayerProfileState(player);
  for (const row of character.combat) assert.equal(profile.currentClass.stats[row.id], row.value);
  for (const key of ['maxHp','maxMp','maxCp']) assert.equal(profile.currentClass.stats[key],character.player[key]);
  assert.equal(profile.currentClass.baseClass,'humanFighter');
  assert.ok(profile.currentClass.stats.criticalChance<=500);
});

test('first class choice is free and ignores the obsolete weekly cooldown', () => {
  const player = session();
  player.changeClassTimer = 999999999;
  const result = changePlayerClassForMiniApp(player, 'humanMystic', 1000);

  assert.equal(result.ok, true);
  assert.equal(player.game.gameClass.stats.name, 'humanMystic');
  assert.equal(result.profile.currentClass.name, 'humanMystic');
  assert.equal(result.profile.classChangeRemainingMs, 0);
  assert.equal(player.game.inventory.luckCoins,100);
  assert.equal(result.spent,0);
});

test('class change rejects the same class and costs 20 CoL without cooldown', () => {
  const player = session();
  assert.equal(changePlayerClassForMiniApp(player, 'humanFighter', 1000).ok, true);
  assert.equal(changePlayerClassForMiniApp(player, 'humanFighter', 1001).reason, 'same_class');

  const changed = changePlayerClassForMiniApp(player, 'elvenFighter', 1001);
  assert.equal(changed.ok, true);
  assert.equal(changed.spent,20);
  assert.equal(player.game.inventory.luckCoins,80);
  assert.equal(changed.profile.classChangeRemainingMs,0);
});

test('class can be changed repeatedly at the same time, charging each successful change', () => {
  const player = session();
  const start = 1000;
  changePlayerClassForMiniApp(player, 'humanFighter', start);
  const result = changePlayerClassForMiniApp(player, 'darkMystic', start);

  assert.equal(result.ok, true);
  assert.equal(player.game.gameClass.stats.name, 'darkMystic');
  assert.equal(changePlayerClassForMiniApp(player,'elvenFighter',start).ok,true);
  assert.equal(player.game.inventory.luckCoins,60);
});

test('gender accepts only legacy male/female values', () => {
  const player = session();
  assert.equal(changePlayerGenderForMiniApp(player, 'female', 1000).ok, true);
  assert.equal(player.gender, 'female');
  assert.equal(player.game.inventory.luckCoins,93);
  assert.equal(changePlayerGenderForMiniApp(player,'female',1001).reason,'same_gender');
  assert.equal(changePlayerGenderForMiniApp(player, 'other', 1000).reason, 'unknown_gender');
  assert.equal(player.gender, 'female');
  assert.equal(player.game.inventory.luckCoins,93);
});

test('insufficient CoL rejects both services without changing the character or spending',()=>{
 const player=session();changePlayerClassForMiniApp(player,'humanFighter',1000);
 player.game.inventory.luckCoins=6;
 const before=structuredClone(player);
 assert.equal(changePlayerClassForMiniApp(player,'humanMystic',1001).reason,'not_enough_luck_coins');
 assert.equal(changePlayerGenderForMiniApp(player,'female',1001).reason,'not_enough_luck_coins');
 assert.deepEqual(player,before);
});

test('server quotes fixed prices and exact balances permit only one paid action',()=>{
 const player=session();changePlayerClassForMiniApp(player,'humanFighter',1000);player.game.inventory.luckCoins=20;
 const profile=getPlayerProfileState(player);
 assert.equal(profile.classChangeCost,20);assert.equal(profile.genderChangeCost,7);
 assert.equal(changePlayerClassForMiniApp(player,'humanMystic',1001).ok,true);
 assert.equal(player.game.inventory.luckCoins,0);
 assert.equal(changePlayerClassForMiniApp(player,'elvenFighter',1001).reason,'not_enough_luck_coins');
 player.game.inventory.luckCoins=7;assert.equal(changePlayerGenderForMiniApp(player,'female',1001).ok,true);
 assert.equal(player.game.inventory.luckCoins,0);
});

test('paid changes cannot unlock a profession stage before it is earned', () => {
  const player = session();
  assert.equal(changePlayerClassForMiniApp(player, 'humanKnight', 1000).reason, 'profession_locked');
  assert.equal(changePlayerClassForMiniApp(player, 'titan', 1000).reason, 'profession_locked');
});

test('switching profession drops a running quest but keeps earned stages and completed quests', () => {
  const player = session();
  changePlayerClassForMiniApp(player, 'humanFighter', 1000);
  player.game.classQuest = { active: { to: 'humanKnight', progress: {} }, completed: ['warriorProf'] };
  const result = changePlayerClassForMiniApp(player, 'humanWizard', 1000 + 8 * 24 * 60 * 60 * 1000);
  assert.equal(result.ok, true);
  assert.equal(player.game.classQuest.active, null);
  assert.deepEqual(player.game.classQuest.completed, ['warriorProf']);
});

test('race and profession change together for 20 CoL at each earned promotion stage', () => {
  for(const [from,to,level,stage] of [
    ['humanKnight','elvenKnight',20,1],
    ['paladin','templeKnight',40,2],
    ['phoenixKnight','evasTemplar',80,3],
  ]) {
    const player=session();player.game.stats.lvl=level;changeClass(player,from);
    player.game.inventory.luckCoins=20;
    const statsBefore=structuredClone(player.game.stats);
    const result=changePlayerClassForMiniApp(player,to);
    assert.equal(result.ok,true);assert.equal(result.spent,20);
    assert.equal(result.race,'elf');assert.equal(result.profile.currentClass.race,'elf');
    assert.equal(result.profile.professionStage,stage);
    assert.equal(result.profile.currentClass.name,to);
    assert.equal(player.game.inventory.luckCoins,0);
    assert.deepEqual(player.game.stats,statsBefore);assert.equal(player.gender,'male');
    assert.equal(getCharacterState(player).player.race,'elf');
    assert.ok(result.profile.eligibleClasses.every(item=>L2_CLASS_META[Object.keys(L2_CLASS_META).find(id=>L2_CLASS_META[id].key===item.name)].level===stage));
  }
});

test('stage upgrades, downgrades, insufficient level and insufficient CoL do not mutate the player', () => {
  const player=session();changeClass(player,'humanKnight');
  let before=structuredClone(player);
  assert.equal(changePlayerClassForMiniApp(player,'elvenFighter').reason,'profession_locked');
  assert.equal(changePlayerClassForMiniApp(player,'templeKnight').reason,'profession_locked');
  assert.equal(changePlayerClassForMiniApp(player,'missing').reason,'unknown_class');
  assert.deepEqual(player,before);
  player.game.stats.lvl=19;before=structuredClone(player);
  assert.equal(changePlayerClassForMiniApp(player,'elvenKnight').reason,'level_too_low');assert.deepEqual(player,before);
  player.game.stats.lvl=20;player.game.inventory.luckCoins=19;before=structuredClone(player);
  assert.equal(changePlayerClassForMiniApp(player,'elvenKnight').reason,'not_enough_luck_coins');assert.deepEqual(player,before);
});
