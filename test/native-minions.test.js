import test from 'node:test';import assert from 'node:assert/strict';
import data from '../template/nativeMinions.js';
import fs from 'node:fs';
import {ITEM_ICONS} from '../webapp/art/l2-gameplay-icons.js';
import {nativeMinionProposal,syncNativeMinions} from '../functions/game/world/nativeMinions.js';
import {nativeActorPoint,nativeFieldBuckets,activateNativeField,nativeMobMovement,placeNativeActor,syncNativePopulation} from '../functions/game/world/nativeFieldSpace.js';
import levels from '../template/nativeLevelRoutes.js';
import {worldAction,advanceWorld,worldState} from '../functions/game/world/world.js';
import {ensureHunt,advanceHunt,mobDto} from '../functions/game/hunt/huntFight.js';
import {getMobDef,getZone,npcBehaviour,buildMob} from '../functions/game/hunt/huntMobs.js';
import {provokeMob,pursuePlayer} from '../functions/game/hunt/huntAi.js';
import {findNativePath} from '../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
import {saveNativeField,restoreNativeField} from '../functions/game/world/nativeFieldBanks.js';
import {nativeFieldRooms} from '../functions/game/world/nativeFieldRooms.js';
import {nativeTerritorySource,sampleNativeTerritory} from '../functions/game/world/nativeSpawnTerritory.js';
import {lootRows,itemRow} from '../functions/game/hunt/lootTable.js';
import {grantKillRewards} from '../functions/game/hunt/huntRewards.js';
import {EXP_RATE,readVitality,stageOf} from '../functions/game/player/vitality.js';
import npcSp from '../template/l2NpcSp.js';
import change from '../functions/game/player/changePlayerGameClass.js';import update from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000,zone='cruma-tower',actors=s=>nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs||[]);
function hero(){const s={userId:1,game:{stats:{lvl:44},inventory:{gold:1e6,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:'dion',x:.5,y:.5,path:[],moveAt:NOW,locks:{}}}};const chat={game:{},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);assert.equal(worldAction(s,{action:'walk_location',location:zone},NOW).ok,true);advanceWorld(s,s.game.world.walkHome.until+1);ensureHunt(s,NOW+1e7,()=>.5);for(const m of actors(s))Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:NOW+1e12});return s;}
test('native private proposals preserve original inclusive rolls, collision radius, truncation and source Z',()=>{
 const from={x:1000,y:2000,z:-12080};let draws=[0,0];assert.deepEqual(nativeMinionProposal(from,14,()=>draws.shift()),{x:956,y:2044,z:-12080});
 draws=[.999999,.999999];assert.deepEqual(nativeMinionProposal(from,14,()=>draws.shift()),{x:1200,y:2044,z:-12080});
 for(const actor of Object.values(data.actors)){assert.deepEqual(nativeMobMovement({mobId:actor.definition.id}),actor.movement);assert.equal(npcBehaviour(actor.definition.id).aiDataMissing,false);assert.ok(npcSp[actor.definition.id]>0);for(const row of actor.loot)assert.ok(itemRow(row[0]),String(row[0]));}
});
test('supplemental minion loot keeps original names, grades, prices and exact published client icons',()=>{
 for(const [id,row] of Object.entries(data.items||{})){
  const item=itemRow(id);assert.equal(item.name,row[0]);assert.equal(item.type,row[1]);assert.equal(item.grade,row[2]);assert.equal(item.price,row[3]);
  const icon=data.itemIcons[id].toLowerCase().replaceAll('.','-');assert.equal(ITEM_ICONS['l2_'+id],icon);
  for(const size of [32,64])assert.ok(fs.existsSync(`webapp/art/l2-extra/${icon}-${size}.webp`));
 }
 for(const [id,parents] of Object.entries(data.zones))for(const parent of parents)for(const child of data.masters[parent].entries)assert.equal(getMobDef(getZone(id),child.id),data.actors[child.id].definition);
});
for(const [id,masters] of Object.entries(data.zones))test(`${id}: all automatic source families keep exact quotas or explicit rejected proposals`,()=>{
 let seed=42;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(const npcId of masters){
  const room=nativeFieldRooms(id).find(r=>r.spawns.some(s=>s.id===npcId));assert.ok(room);const source=room.spawns.find(s=>s.id===npcId);
  const point=source.coordinateSource==='point'?source:sampleNativeTerritory(nativeTerritorySource(id,source),{random});assert.ok(point);
  const s=hero(),master=buildMob(getZone(id),getMobDef(getZone(id),npcId),{now:NOW,random,champion:null});assert.equal(placeNativeActor(master,point),true);
  const sourceSlot=room.spawns.slice(0,room.spawns.indexOf(source)).reduce((n,s)=>n+s.count,0);Object.assign(master,{instanceId:'source:'+npcId,sourceRoom:room.id,sourceFloor:room.sourceFloor,sourceSlot,sourcePosition:point});
  s.game.hunt={zone:id,field:{native:{version:1,z:master.native.z},x:master.x,y:master.y,mobs:[master],rooms:{},respawns:[]}};
  syncNativeMinions(s,NOW,random);const family=s.game.hunt.field.native.minionFamilies[`${room.id}:${sourceSlot}`],children=actors(s).filter(m=>m.sourceMinion),quota=data.masters[npcId].entries.reduce((n,e)=>n+e.count,0);
  assert.equal(children.length+Object.keys(family.missing).length,quota);assert.ok(children.every(m=>data.masters[npcId].entries.some(e=>e.id===m.mobId)));assert.ok(children.every(m=>getMobDef(getZone(id),m.mobId)&&nativeMobMovement(m)));
  assert.ok(children.every(m=>m.native.z===master.native.z&&m.sourcePosition.z===master.native.z),'direct minion spawn preserves the original leader Z');
  syncNativeMinions(s,NOW+1e6,random);assert.equal(actors(s).filter(m=>m.sourceMinion).length,children.length);
 }
});
test('Cruma automatic Privates appear once, preserve HP through save/load, never respawn alone and replace only missing slots with a new master spawn',()=>{
 let s=hero();const master=actors(s).find(m=>m.mobId==='20751'&&!m.sourceMinion);assert.ok(master);activateNativeField(s.game.hunt,master.sourcePosition,NOW+1e7);syncNativeMinions(s,NOW+1e7,()=>.5);
 const key=`${master.sourceRoom}:${master.sourceSlot}`,children=()=>actors(s).filter(m=>m.sourceMinion?.owner===key);assert.equal(children().length,3);assert.deepEqual(children().map(m=>m.mobId).sort(),['20752','20752','21039']);assert.ok(children().every(m=>m.sourceRespawnMs===0&&m.champion===null&&m.native));
 const marked=children()[0];marked.currentHp=2;const saved={id:marked.instanceId,hp:marked.currentHp};syncNativeMinions(s,NOW+1e7,()=>.9);assert.equal(children().length,3);assert.equal(children()[0].currentHp,2);
 s=JSON.parse(JSON.stringify(s));ensureHunt(s,NOW+1e7,()=>.5);assert.equal(children().find(m=>m.instanceId===saved.id).currentHp,saved.hp);
 const removed=children()[1];for(const b of nativeFieldBuckets(s.game.hunt.field))b.mobs=b.mobs.filter(m=>m.instanceId!==removed.instanceId);syncNativeMinions(s,NOW+2e7,()=>.5);assert.equal(children().length,2);
 const parent=actors(s).find(m=>m.instanceId===master.instanceId);parent.currentHp=0;syncNativeMinions(s,NOW+2e7,()=>.5);assert.equal(children().length,2,'ordinary minions survive their master');
 parent.currentHp=parent.hp;parent.instanceId+=':respawn';syncNativeMinions(s,NOW+2e7,()=>.5);assert.equal(children().length,3);assert.equal(children().find(m=>m.instanceId===saved.id).currentHp,2);assert.equal(new Set(actors(s).map(m=>m.sourceRoom+':'+m.sourceSlot)).size,actors(s).length);
});
test('striking a private alerts its living source family even without a shared social clan',()=>{
 const s=hero(),master=actors(s).find(m=>m.mobId==='20751'&&!m.sourceMinion);activateNativeField(s.game.hunt,master.sourcePosition,NOW+1e7);syncNativeMinions(s,NOW+1e7,()=>.5);
 const key=`${master.sourceRoom}:${master.sourceSlot}`,family=actors(s).filter(m=>m===master||m.sourceMinion?.owner===key);assert.equal(family.length,4);
 for(const m of family){m.aggro=false;m.socialClans=[];m.clanHelpRange=0;}provokeMob(s.game.hunt,family.at(-1),NOW+1e7);assert.ok(family.every(m=>m.aggro));
});
test('both Atlas DTOs mark peaceful family helpers as social even without an XML clan list',()=>{
 const s=hero(),master=actors(s).find(m=>m.mobId==='20751'&&!m.sourceMinion);activateNativeField(s.game.hunt,master.sourcePosition,NOW+1e7);master.aggressive=false;master.socialClans=[];master.clanHelpRange=0;
 assert.equal(mobDto(master,NOW+1e7).social,true);const dto=worldState(s,NOW+1e7).nativeField.actors.find(m=>m.instanceId===master.instanceId);assert.ok(dto);assert.equal(dto.social,true);assert.equal(dto.aggressive,false);
});
test('live minions do not consume fixed source room capacity or prevent their master respawning with missing privates',()=>{
 const s=hero(),master=actors(s).find(m=>m.mobId==='20751'&&!m.sourceMinion),field=s.game.hunt.field,key=`${master.sourceRoom}:${master.sourceSlot}`,family=()=>actors(s).filter(m=>m.sourceMinion?.owner===key);
 const kept=family()[0];assert.ok(kept);kept.currentHp=2;const removed=family()[1];assert.ok(removed);
 for(const b of nativeFieldBuckets(field))b.mobs=b.mobs.filter(m=>m!==master&&m!==removed);
 const bucket=nativeFieldBuckets(field).find(b=>b.mobs.some(m=>m.instanceId===kept.instanceId)),room=nativeFieldRooms(zone).find(r=>r.id===master.sourceRoom);assert.ok(bucket.mobs.length>=room.cap,'fixture exceeds the original static quota');
 field.respawns.push({at:NOW+1e7+100,room:master.sourceRoom,sourceSlot:master.sourceSlot});advanceHunt(s,NOW+1e7+101,()=>.5);
 const fresh=actors(s).find(m=>!m.sourceMinion&&m.sourceRoom===master.sourceRoom&&m.sourceSlot===master.sourceSlot);assert.ok(fresh);assert.notEqual(fresh.instanceId,master.instanceId);assert.equal(family().length,3);assert.equal(family().find(m=>m.instanceId===kept.instanceId).currentHp,2);
});
test('private rewards use their own source SP, experience and drop rows',()=>{
 const s=hero(),def=getMobDef(getZone(zone),'20752');assert.ok(def);const child=actors(s).find(m=>m.mobId==='20752');assert.ok(child);const at=NOW+1e7,bonus=stageOf(readVitality(s,at).points).bonus;
 const rewards=grantKillRewards(s,child,def,{now:at,random:()=>.999999});assert.ok(rewards.exp>0);assert.equal(rewards.sp,Math.round(npcSp['20752']*EXP_RATE*bonus));assert.ok(lootRows('20752').length>10);assert.equal(getMobDef(getZone('ivory-tower'),'20752'),null);
});
test('a wandering private cannot replace the actual floor witness with its original owning floor',()=>{
 const id='tower-of-insolence',point=levels.zones[id].levels[13].to,rooms=nativeFieldRooms(id),upper=rooms.find(r=>r.sourceFloor===13),lower=rooms.find(r=>r.sourceFloor===12);
 const child=buildMob(getZone(id),getMobDef(getZone(id),'21083'),{now:NOW,random:()=>.5,champion:null});assert.equal(placeNativeActor(child,point),true);
 Object.assign(child,{instanceId:'wandering-private',sourceFloor:12,sourceRoom:lower.id,sourceSlot:'private:fixture:0',sourceMinion:{owner:`${lower.id}:0`,slot:0,masterId:'21081'}});
 const hunt={zone:id,field:{native:{version:1,z:point.z,loaded:{},missing:{},randomGroups:{},sourceFloor:13},x:point.x/2000,y:point.y/2000,room:upper.id,mobs:[],rooms:{[lower.id]:{mobs:[child]}},respawns:[],visited:[upper.id],seq:0}};
 syncNativePopulation(hunt,{rooms},NOW,()=>[],()=>.5);assert.equal(hunt.field.native.sourceFloor,13);assert.equal(hunt.field.room,upper.id);
});
test('an idle private follows its living master over real ground at source walk speed without teleporting or healing',()=>{
 const s=hero(),master=actors(s).find(m=>m.mobId==='20751'&&!m.sourceMinion);activateNativeField(s.game.hunt,master.sourcePosition,NOW);syncNativeMinions(s,NOW,()=>.5);
 const key=`${master.sourceRoom}:${master.sourceSlot}`,child=actors(s).find(m=>m.sourceMinion?.owner===key),point=nativeActorPoint(master);
 const away=[[400,0],[-400,0],[0,400],[0,-400]].map(([x,y])=>({x:point.x+x,y:point.y+y,z:point.z})).find(p=>findNativePath(point,p,{allowed:nativeGroundAllowed,maxNodes:6000,stride:2,reversible:true,heuristicWeight:2}).ok);assert.ok(away);
 child.x=away.x/2000;child.y=away.y/2000;child.native.z=away.z;child.currentHp=2;child.aggro=false;child.lastMoveAt=NOW;delete child.native.journey;delete child.native.following;
 const before=nativeActorPoint(child);pursuePlayer(s.game.hunt,NOW+2000);const after=nativeActorPoint(child),travelled=Math.hypot(after.x-before.x,after.y-before.y);
 assert.ok(travelled>0);assert.ok(travelled<=nativeMobMovement(child).walkSpeed*2+1e-6);assert.equal(child.currentHp,2);assert.ok(child.native.following);
 const paused=nativeActorPoint(child);pursuePlayer(s.game.hunt,NOW+1e6);const resumed=nativeActorPoint(child);assert.ok(Math.hypot(resumed.x-paused.x,resumed.y-paused.y)<=nativeMobMovement(child).walkSpeed*5+1e-6,'no offline catch-up teleport');
 saveNativeField(s,NOW+1e6);const id=child.instanceId;assert.equal(restoreNativeField(s,zone,NOW+2e6),true);const restored=actors(s).find(m=>m.instanceId===id);assert.equal(restored.native.journey,undefined);assert.equal(restored.native.following,undefined);assert.equal(restored.currentHp,2);assert.deepEqual(nativeActorPoint(restored),resumed);
 actors(s).find(m=>m.instanceId===master.instanceId).currentHp=0;const stopped=nativeActorPoint(restored);pursuePlayer(s.game.hunt,NOW+2e6+2000);assert.deepEqual(nativeActorPoint(restored),stopped);
});
