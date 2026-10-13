import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateSpEconomy,SP_ECONOMY_VERSION} from '../functions/game/player/spEconomy.js';
import {grantKillRewards} from '../functions/game/hunt/huntRewards.js';
import {skillLearnCost} from '../functions/game/player/skillLearning.js';
import npcSp from '../template/l2NpcSp.js';
import fields from '../template/huntingTemplate.js';
import native from '../template/l2Classes.js';
import {EXP_RATE} from '../functions/game/player/vitality.js';
test('existing SP and pending old prizes migrate once, including a reload',()=>{
 const s={game:{inventory:{sp:2561},gachaTempItem:{rewardRef:'sp',amount:20},mailbox:[{rewards:[{kind:'sp',amount:15}]}]}};
 assert.equal(migrateSpEconomy(s),true);assert.equal(s.game.inventory.sp,51220000);assert.equal(s.game.gachaTempItem.amount,400000);assert.equal(s.game.mailbox[0].rewards[0].amount,300000);
 const reloaded=JSON.parse(JSON.stringify(s));assert.equal(migrateSpEconomy(reloaded),false);assert.equal(reloaded.game.inventory.sp,51220000);assert.equal(reloaded.game.spEconomyVersion,SP_ECONOMY_VERSION);
});
test('fresh and already migrated characters do not receive a bonus',()=>{
 const s={game:{inventory:{sp:0}}};migrateSpEconomy(s);assert.equal(s.game.inventory.sp,0);s.game.inventory.sp=12345;assert.equal(migrateSpEconomy(s),false);assert.equal(s.game.inventory.sp,12345);
});
test('skill learning prices equal the original native SP table without rounding to game units',()=>{
 const rows=Object.values(native.learn).flat(),row=rows.find(r=>r[3]>1000000);
 const cost=skillLearnCost({l2Id:row[0]});const candidates=rows.filter(r=>r[0]===row[0]).sort((a,b)=>a[1]-b[1]||a[3]-b[3]);assert.equal(cost.sp,candidates[0][3]);
});
test('hunting credits original NPC SP times rate and vitality, even at the level cap',()=>{
 const zone=fields.find(f=>f.mobs.some(m=>m.level>=75));const def=zone.mobs.find(m=>m.level>=75);
 const s={userId:1,game:{stats:{lvl:def.level,currentExp:0},inventory:{sp:0,gold:0,materials:{},equipment:{items:[]}},effects:[],builds:{},equipmentStats:{}}};
 const result=grantKillRewards(s,{id:def.id,level:def.level,zone:zone.id},def,{random:()=>.999,now:1800000000000});assert.equal(result.sp,npcSp[def.id]*EXP_RATE*3);assert.equal(s.game.inventory.sp,result.sp);
});
