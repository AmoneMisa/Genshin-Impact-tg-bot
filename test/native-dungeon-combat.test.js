import test from 'node:test';import assert from 'node:assert/strict';
import registry from '../template/nativeFieldPilot.js';
import {LOCATION_LEVELS} from '../template/locationLevels.js';
import {worldAction} from '../functions/game/world/world.js';
import {nativeActorPoint,nativeFieldBuckets,activateNativeField} from '../functions/game/world/nativeFieldSpace.js';
import {selectHuntTarget,setHuntAttack,advanceHunt} from '../functions/game/hunt/huntFight.js';
import {nativeLevelOptions} from '../functions/game/world/nativeLevelTravel.js';
import change from '../functions/game/player/changePlayerGameClass.js';import update from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000;
for(const [id,meta]of Object.entries(registry.fields).filter(([,m])=>m.dungeon))test(`${id}: native combat pays the existing NPC rewards once and retains its source respawn slot`,()=>{
 const level=Math.min(85,Math.max(...LOCATION_LEVELS[id].mobs.map(m=>m.level)));
 const s={userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:level,currentExp:0},inventory:{gold:1e6,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:meta.city,x:.5,y:.5,path:[],moveAt:NOW,locks:{}}}};
 const chat={game:{},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);
 assert.ok(worldAction(s,{action:'quick_travel',location:id},NOW).ok);const option=nativeLevelOptions(s.game.hunt).find(t=>t.floor===1&&t.enabled);assert.ok(option);
 assert.ok(worldAction(s,{action:'native_floor',floor:1,routeId:option.routeId},NOW+1).ok);
 const actors=()=>nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs||[]),quiet=()=>{for(const m of actors())Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:NOW+1e12});};
 quiet();const victim=actors().toSorted((a,b)=>b.level-a.level)[0];assert.ok(victim);
 s.game.stats.lvl=victim.level;update(s);
 // The fixture stands at an actual spawned source actor. Selection, attack,
 // death, rewards and respawn bookkeeping use the normal game handlers.
 activateNativeField(s.game.hunt,nativeActorPoint(victim),NOW+2);victim.currentHp=1;
 assert.ok(selectHuntTarget(s,victim.instanceId,NOW+2).ok);const beforeSp=s.game.inventory.sp||0;assert.ok(setHuntAttack(s,true,NOW+2).ok);
 let now=NOW+2;for(let i=0;i<30&&!s.game.hunt.kills;i++){now+=1000;quiet();advanceHunt(s,now,()=>.5);}
 assert.equal(s.game.hunt.kills,1);assert.ok(victim.rewarded?.exp>0);assert.ok(victim.rewarded.sp>0);assert.equal(s.game.inventory.sp,beforeSp+victim.rewarded.sp);
 assert.ok(setHuntAttack(s,false,now).ok);assert.equal(actors().some(m=>m.instanceId===victim.instanceId),false);
 const pending=s.game.hunt.field.respawns.filter(r=>r.room===victim.sourceRoom&&r.sourceSlot===victim.sourceSlot);assert.equal(pending.length,1);assert.ok(pending[0].at>now);
 const sp=s.game.inventory.sp;quiet();advanceHunt(s,now+1,()=>.5);assert.equal(s.game.inventory.sp,sp);assert.equal(s.game.hunt.kills,1);
});
