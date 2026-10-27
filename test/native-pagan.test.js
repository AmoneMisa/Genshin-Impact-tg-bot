import test from 'node:test';
import assert from 'node:assert/strict';
import {worldAction,advanceWorld,worldState,cityPoint,CITIES,CITY_NPCS} from '../functions/game/world/world.js';
import {enterHuntField} from '../functions/game/hunt/huntFight.js';
import {activateNativeField,nativeActorPoint,nativeFieldBuckets,placeNativeActor} from '../functions/game/world/nativeFieldSpace.js';
import {nativeGroundBlock,nativeGroundFor,nativeGroundForActor} from '../functions/game/world/nativeGround.js';
import {nativeDoorStore,syncNativeDoors} from '../functions/game/world/nativeDoorContext.js';
import {nativeSegment} from '../functions/game/world/nativeNavigation.js';
import {createNativeJourney,advanceNativeJourney} from '../functions/game/world/nativeJourney.js';
import {nativeFieldRooms} from '../functions/game/world/nativeFieldRooms.js';
import {nativeFloorTeleport} from '../functions/game/world/nativeFloorTransports.js';
import {saveNativeField} from '../functions/game/world/nativeFieldBanks.js';
import {levelTransitions} from '../functions/game/hunt/locationLevels.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
import access from '../template/paganAccess.js';
import registry from '../template/nativeFieldPilot.js';
const NOW=1800000000000,zone='pagan-temple';
function hero(chat){
 const s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'location',city:'rune',location:zone,x:.5,y:.5,path:[],moveAt:NOW,locks:{}}}};
 if(chat){s.ownerDocument=()=>chat;(chat.members||=[]).push(s);}
 change(s,'humanFighter');update(s);assert.ok(enterHuntField(s,zone,{now:NOW,floor:1}).ok);
 activateNativeField(s.game.hunt,access.mirrors[32039].to,NOW);s.game.hunt.field.native.sourceFloor=1;quiet(s);return s;
}
const actors=s=>nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs||[]);
function quiet(s){for(const m of actors(s))Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:NOW+1e12});}
function stand(s,npc){activateNativeField(s.game.hunt,access.npcs[npc].point,NOW);s.game.hunt.field.native.sourceFloor=1;quiet(s);}
const open=(s,npc,now=NOW)=>worldAction(s,{action:'native_floor',floor:1,routeId:`${npc}:SCRIPT:0`},now);

test('Pagan reuses all 364 source slots, keeps source file provenance and verifies every placement',()=>{
 assert.equal(registry.fields[zone].count,364);let count=0;
 for(const room of nativeFieldRooms(zone))for(const slot of room.spawns){
  assert.equal(slot.sourceFile,'spawns/Others/19_16.xml');assert.equal(slot.coordinateSource,'point');
  assert.ok(placeNativeActor({},slot),JSON.stringify(slot));count+=slot.count;
 }
 assert.equal(count,364);
});
for(const rule of access.doors)test(`Pagan ${rule.npcId}: original passes, free exit and precise shared close deadline`,()=>{
 const chat={game:{}},s=hero(chat),other=hero(chat);stand(s,rule.npcId);
 if(rule.anyCarriedItem.length){
  assert.equal(open(s,rule.npcId).reason,'pagan_mark_required');
  for(const item of rule.anyCarriedItem){
   s.game.inventory.materials={['l2_'+item]:1};assert.ok(open(s,rule.npcId).ok);assert.equal(s.game.inventory.materials['l2_'+item],1);
  }
 }else assert.ok(open(s,rule.npcId).ok);
 assert.equal(s.game.inventory.gold,1000000);
 for(const id of rule.doorIds){
  assert.equal(nativeDoorStore(other)[id].until,NOW+10000);
  const geometry=worldState(s,NOW).nativeField.doors.find(d=>d.id===String(id));assert.equal(geometry.open,true);
  assert.equal(worldState(s,NOW+9999).nativeField.doors.find(d=>d.id===String(id)).open,true);
  assert.equal(worldState(s,NOW+10000).nativeField.doors.find(d=>d.id===String(id)).open,false);
 }
 // Talking again cannot postpone an already scheduled source close event.
 assert.ok(open(s,rule.npcId,NOW+5000).ok);assert.equal(nativeDoorStore(s)[rule.doorIds[0]].until,NOW+10000);
});
test('Pagan door actions reject forged routes, wrong layer, distance and active actions',()=>{
 const s=hero();stand(s,32035);const p=nativeActorPoint(s.game.hunt.field);
 assert.equal(worldAction(s,{action:'native_floor',floor:2,routeId:'32035:SCRIPT:0'},NOW).reason,'invalid_floor');
 assert.equal(worldAction(s,{action:'native_floor',floor:1,routeId:'32035:SCRIPT:99'},NOW).reason,'invalid_floor');
 s.game.hunt.field.native.z+=10000;assert.equal(nativeFloorTeleport(s,1,NOW,'32035:SCRIPT:0').reason,'npc_too_far');
 stand(s,32035);s.game.hunt.field.x+=1;assert.equal(nativeFloorTeleport(s,1,NOW,'32035:SCRIPT:0').reason,'npc_too_far');
 stand(s,32035);s.game.hunt.field.action={};assert.equal(nativeFloorTeleport(s,1,NOW,'32035:SCRIPT:0').reason,'npc_interaction_blocked');
 assert.equal(nativeActorPoint(s.game.hunt.field).z,p.z);assert.equal(Object.keys(nativeDoorStore(s)).length,0);
});
test('the ritual route begins a real walk and cannot use the old authored floor teleport',()=>{
 const s=hero(),before=nativeActorPoint(s.game.hunt.field);
 assert.ok(worldAction(s,{action:'native_floor',floor:2},NOW).ok);
 assert.equal(s.game.hunt.field.native.journey.native.floorGoal,2);
 assert.equal(worldAction(s,{action:'floor',floor:2},NOW).reason,'invalid_floor');
 assert.deepEqual(nativeActorPoint(s.game.hunt.field),before);
 assert.equal(s.game.inventory.gold,1000000);
});
test('Pagan opened door affects real cells, survives JSON and blocks a saved walk at the close deadline',()=>{
 let s=hero();stand(s,32035);
 const from={x:-16360,y:-36700,z:-10720},to={x:-16360,y:-36920,z:-10720},door={x:-16360,y:-36790,z:-10720};
 assert.equal(nativeGroundBlock(door),'door_state_required');assert.equal(nativeSegment(from,to,{allowed:nativeGroundFor(s,NOW)}),null);
 assert.ok(open(s,32035).ok);const allowed=nativeGroundFor(s,NOW);assert.ok(allowed(door));
 assert.ok(nativeSegment(from,to,{allowed,reversible:true}));
 const trip=createNativeJourney(from,[to],{now:NOW,speed:100,allowed});assert.ok(trip);
 s=JSON.parse(JSON.stringify(s));syncNativeDoors(s,NOW+10000);
 assert.equal(nativeGroundForActor(s.game.hunt.field,NOW+10000)(door),false);
 assert.equal(advanceNativeJourney(trip,NOW+10000,100,{allowed:nativeGroundFor(s,NOW+10000)}),false);
 assert.equal(trip.native.blocked,'path_blocked');assert.deepEqual(trip.native.point,from);
});
test('Pagan mirror returns to its original Rune point and church overlay preserves the underground bank',()=>{
 const s=hero();advanceWorld(s,NOW);quiet(s);const victim=actors(s)[0];assert.ok(victim);victim.currentHp=2;const id=victim.instanceId;
 stand(s,32040);assert.ok(worldAction(s,{action:'native_floor',floor:3,routeId:'32040:SCRIPT:0'},NOW).ok);
 assert.equal(s.game.world.mode,'city');assert.equal(s.game.world.z,718);assert.equal(s.game.hunt.field,null);
 const city=CITIES.find(c=>c.id==='rune');assert.deepEqual({x:s.game.world.x,y:s.game.world.y},cityPoint(city,access.mirrors[32040].to));
 const bank=s.game.world.nativeFields[zone].data;
 const church=CITY_NPCS.find(n=>n.service==='pagan-church');Object.assign(s.game.world,cityPoint(city,church));
 assert.ok(worldAction(s,{action:'pagan_church'},NOW).ok);assert.equal(s.game.hunt.field.floor,3);assert.equal(s.game.hunt.field.native,undefined);
 saveNativeField(s,NOW+1);assert.equal(s.game.world.nativeFields[zone].data,bank);
 for(const floor of [4,1]){
  const f=s.game.hunt.field,d=levelTransitions(zone,f).destinations.find(d=>d.floor===floor);assert.ok(d);
  Object.assign(f,{room:d.room,...d.point});assert.ok(worldAction(s,{action:'floor',floor},NOW+2).ok);
 }
 assert.deepEqual(nativeActorPoint(s.game.hunt.field),access.mirrors[32039].to);
 const restored=actors(s).filter(m=>m.instanceId===id);assert.equal(restored.length,1);assert.equal(restored[0].currentHp,2);
 assert.equal(s.game.inventory.gold,1000000);assert.equal(s.game.world.nativeFields[zone],undefined);
});
