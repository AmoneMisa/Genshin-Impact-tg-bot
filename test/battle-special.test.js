import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import {battleSpecialDto,excludeToggleSkills} from '../miniapp/battleSpecial.js';
import {getL2BuffsState} from '../miniapp/l2Buffs.js';
import {getHotbar} from '../functions/game/player/hotbar.js';
import {castL2Buff} from '../miniapp/l2Buffs.js';
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
test('summons are on the second tab with real costs and cannot bypass mana while active',()=>{
 const session={userId:0,userChatData:{user:{id:0}},game:{stats:{lvl:85},inventory:{gold:0,materials:{},equipment:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(session,'arcanaLord');updateStats(session);
 const now=Date.now(), rows=battleSpecialDto(session,now),summons=rows.filter(s=>s.type==='summon');
 assert.ok(summons.length>0);
 const summon=summons[0]; assert.ok(summon.costMp>0);assert.ok(summon.description);
 session.game.gameClass.skills.push({name:summon.name});
 const index=session.game.gameClass.skills.length-1;
 session.game.hotbar=[index];assert.ok(!getHotbar(session).includes(index));
 assert.deepEqual(excludeToggleSkills([{index,name:summon.name}],rows),[]);
 session.game.gameClass.stats.mp=10000;
 assert.equal(castL2Buff(session,summon.id,null,{now}).ok,true);
 session.game.gameClass.stats.mp=0;
 const running=battleSpecialDto(session,now+1).find(s=>s.id===summon.id);
 assert.equal(running.running,true);assert.equal(running.canUse,false);
});
