import test from 'node:test';
import assert from 'node:assert/strict';
import DATA from '../template/l2PlayerStats.js';
import classes from '../template/classStatsTemplate.js';
import getClassStats from '../functions/game/player/getters/getGameClassStatsFromTemplate.js';
import {migrateBaseStats} from '../functions/game/player/migrateBaseStats.js';
import clanDuel from '../functions/game/clans/clanDuel.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
test('all live classes use High Five resource tables rather than legacy linear growth',()=>{
  for(const c of classes.filter(c=>c.l2Id!==undefined))for(const level of [1,20,40,47,76,85]){
    const s=getClassStats(c.name,level),row=DATA[c.l2Id].levels[level];
    assert.equal(s.maxHp,Math.round(row[0]),c.name);assert.equal(s.maxMp,Math.round(row[1]),c.name);
    assert.equal(s.maxCp,Math.round(row[2]),c.name);assert.ok(s.pAtk>0&&s.mAtk>0&&s.pDef>0&&s.mDef>0,c.name);
  }
  assert.equal(getClassStats('humanMystic',47).maxHp,989);
  assert.notEqual(getClassStats('humanMystic',47).pAtk,getClassStats('humanMystic',47).mAtk);
});
test('the migration preserves resource ratios and is idempotent, including death',()=>{
  const s={game:{stats:{lvl:47},gameClass:{stats:{name:'humanMystic',maxHp:100000,hp:50000,maxMp:40000,mp:10000,maxCp:20000,cp:0}}}};
  assert.equal(migrateBaseStats(s),true);assert.equal(s.game.gameClass.stats.hp,495);assert.equal(s.game.gameClass.stats.mp,115);
  assert.equal(s.game.gameClass.stats.cp,0);const before=structuredClone(s);assert.equal(migrateBaseStats(s),false);assert.deepEqual(s,before);
  s.game.baseStatsVersion=0;s.game.gameClass.stats.hp=0;migrateBaseStats(s);assert.equal(s.game.gameClass.stats.hp,0);
});
test('canonical L2 classes complete duels with bounded resource percentages',()=>{
  const hero=name=>{const s={userId:1,game:{stats:{lvl:47},gameClass:{stats:{}},effects:[],equipmentStats:{},inventory:{}}};changeClass(s,name);updateStats(s);return s;};
  for(const [a,b] of [['humanWizard','humanKnight'],['sorcerer','necromancer'],['treasureHunter','hawkeye']]){
    const result=clanDuel(hero(a),hero(b));assert.ok([0,1,2].includes(result.result));
    assert.ok(result.attackerPercent>=0&&result.attackerPercent<=100);assert.ok(result.defenderPercent>=0&&result.defenderPercent<=100);
  }
});
