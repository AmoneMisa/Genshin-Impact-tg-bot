import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import {battleSpecialDto,excludeToggleSkills} from '../miniapp/battleSpecial.js';
import {getL2BuffsState} from '../miniapp/l2Buffs.js';
test('toggle tiles carry actual MP costs, descriptions and stay off the main bar',()=>{
 const session={userId:0,userChatData:{user:{id:0}},game:{stats:{lvl:85},inventory:{gold:0,materials:{},equipment:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(session,'warlord');updateStats(session);
 const rows=battleSpecialDto(session),buffs=getL2BuffsState(session);
 assert.ok(rows.some(s=>s.type==='toggle'));
 for(const row of rows.filter(s=>s.type==='toggle')){
  assert.equal(row.costMp,buffs.find(b=>b.id===row.id).cost);
  assert.ok(row.description);
 }
 const skills=rows.map((s,index)=>({index,name:s.name})).concat({index:99,name:'Triple Slash'});
 assert.deepEqual(excludeToggleSkills(skills,rows),[{index:99,name:'Triple Slash'}]);
});
