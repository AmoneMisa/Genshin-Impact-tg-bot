import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../template/nativeDungeonAccess.js';
import entries from '../template/dungeonEntranceEntries.js';
import registry from '../template/nativeFieldPilot.js';
import maps from '../template/nativeInteriorMaps.js';
import {LOCATION_LEVELS} from '../template/locationLevels.js';
import {worldAction,worldState,advanceWorld} from '../functions/game/world/world.js';
import {nativeActorPoint,nativeFieldBuckets} from '../functions/game/world/nativeFieldSpace.js';
import {nativeFloorGuides} from '../functions/game/world/nativeFloorTransports.js';
import {nativeFieldRooms} from '../functions/game/world/nativeFieldRooms.js';
import {sampleNativeTerritory,nativeTerritorySource} from '../functions/game/world/nativeSpawnTerritory.js';
import {placeNativeActor} from '../functions/game/world/nativeFieldSpace.js';
import {nativeSegment} from '../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
import {nativeLevelOptions} from '../functions/game/world/nativeLevelTravel.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
import {enterHuntField} from '../functions/game/hunt/huntFight.js';
import npcRoutes from '../template/nativeNpcRoutes.js';
import {worldGeodata} from '../functions/game/world/l2jGeodata.js';
import {ROOM_SIZE} from '../functions/game/world/navigation.js';
const NOW=1800000000000;
const actors=s=>nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs||[]);
function hero(id){const s={userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:85,currentExp:0},inventory:{gold:1e6,materials:{scroll_escape:2},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:data.zones[id].city,x:.5,y:.5,path:[],moveAt:NOW,locks:{}}}};const chat={game:{},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);return {s,chat};}
function quiet(s){for(const m of actors(s))Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:NOW+1e12});}
function gate(s,floor,now){const target=nativeLevelOptions(s.game.hunt).find(t=>t.floor===floor&&t.enabled);assert.ok(target);const result=worldAction(s,{action:'native_floor',floor,routeId:target.routeId,point:{x:0,y:0,z:0}},now);assert.ok(result.ok,JSON.stringify(result));quiet(s);}

test('all existing dungeons retain their source gates and tables under the explicit free-admission exception',()=>{
 assert.equal(data.admission,'free-entry-user-agreement');assert.equal(data.sevenSignsRequired,false);assert.equal(Object.keys(data.zones).length,14);
 for(const [id,d]of Object.entries(data.zones)){
  const old=entries[id].dungeonEntranceSource;
  assert.equal(d.outside.npcId,old.npcId);assert.equal(d.inside.npcId,old.interiorNpcId);
  assert.deepEqual(d.outside.point,{x:entries[id].x,y:entries[id].y,z:entries[id].z});
  assert.deepEqual(d.outside.targets[0].point,old.insideDestination);assert.deepEqual(d.inside.targets[0].point,old.returnDestination);
  for(const p of [d.outside,d.inside]){assert.equal(p.targets[0].fee,0);assert.equal(p.targets[0].item,57);assert.equal(p.targets[0].source.sha256,data.source.files[p.targets[0].source.file]);}
 }
});

for(const [id,meta]of Object.entries(registry.fields).filter(([,m])=>m.dungeon))test(`${id}: existing population moves to native ground, free source gates preserve HP and ownership`,()=>{
 const d=data.zones[id];let {s,chat}=hero(id);
 const slots=nativeFieldRooms(id).flatMap(r=>r.spawns),count=slots.reduce((n,p)=>n+p.count,0);assert.equal(count,meta.count);
 assert.equal(count,LOCATION_LEVELS[id].floors.flatMap(f=>f.rooms).flatMap(r=>r.spawns).reduce((n,p)=>n+p.count,0));
 for(const source of slots){const point=source.coordinateSource==='point'?source:sampleNativeTerritory(nativeTerritorySource(id,source));assert.ok(point);assert.ok(placeNativeActor({},point));}
 const fee=worldState(s,NOW).quickTravel.locations.find(l=>l.id===id).gold;
 assert.ok(worldAction(s,{action:'quick_travel',location:id},NOW).ok);assert.equal(s.game.inventory.gold,1e6-fee);
 assert.equal(worldState(s,NOW).nativeField.zone,id);assert.equal(s.game.hunt.field.native.outside,true);assert.deepEqual(nativeActorPoint(s.game.hunt.field),d.arrival);
 const cash=s.game.inventory.gold;gate(s,1,NOW+1);assert.equal(s.game.hunt.field.native.outside,false);assert.deepEqual(nativeActorPoint(s.game.hunt.field),d.outside.targets[0].point);assert.equal(s.game.inventory.gold,cash);
 const dto=worldState(s,NOW+2);quiet(s);assert.ok(dto.nativeField.ground);assert.ok(dto.nativeField.actors.length<=48);assert.ok(maps.maps[id].bytes<100000);
 let now=NOW+4;
 if(!nativeFloorGuides(s.game.hunt)[0].near){
  assert.equal(worldAction(s,{action:'native_floor',floor:0},NOW+3).reason,'npc_too_far');
  const approach=worldAction(s,{action:'native_guide',npcId:d.inside.npcId},now);assert.ok(approach.ok,JSON.stringify(approach));
  const trip=s.game.hunt.field.native.journey;let previous=trip.native.point;for(const p of trip.native.path){assert.ok(nativeSegment(previous,p,{allowed:nativeGroundAllowed,reversible:true}));previous=p;}
  now=trip.until+1;advanceWorld(s,now);quiet(s);
 }else assert.ok(nativeLevelOptions(s.game.hunt).find(t=>t.floor===0)?.enabled,'an arrival already next to the NPC needs no invented walk');
 assert.ok(nativeFloorGuides(s.game.hunt)[0].near);
 const all=actors(s),victim=all[0];assert.ok(victim);victim.currentHp=2;const key=victim.instanceId,position={...victim.sourcePosition};
 s=JSON.parse(JSON.stringify(s));s.ownerDocument=()=>chat;gate(s,0,now+1);assert.deepEqual(nativeActorPoint(s.game.hunt.field),d.inside.targets[0].point);
 assert.equal(worldState(s,now+2).nativeField.zone,id,'the exterior ziggurat retains the canonical dungeon bank');quiet(s);
 gate(s,1,now+3);assert.equal(actors(s).filter(m=>m.instanceId===key).length,1);assert.equal(actors(s).find(m=>m.instanceId===key).currentHp,2);assert.deepEqual(actors(s).find(m=>m.instanceId===key).sourcePosition,position);
 const point=nativeActorPoint(s.game.hunt.field);assert.equal(worldAction(s,{action:'native_floor',floor:0,routeId:'forged'},now+4).ok,false);assert.deepEqual(nativeActorPoint(s.game.hunt.field),point);
 assert.equal(s.game.inventory.gold,cash);assert.equal(new Set(actors(s).map(m=>m.sourceRoom+':'+m.sourceSlot)).size,actors(s).length);
 // A normal quick departure/re-entry consumes the saved bank, keeping wounds.
 quiet(s);const cities=worldState(s,now+5).quickTravel.cities,city=cities.find(c=>c.id===meta.city)||cities[0];assert.ok(city,'an existing permitted town route is required');
 const departure=worldAction(s,{action:'quick_travel',city:city.id},now+5);assert.ok(departure.ok,JSON.stringify(departure));assert.ok(worldAction(s,{action:'quick_travel',location:id},now+6).ok);gate(s,1,now+7);
 const restored=actors(s).find(m=>m.instanceId===key);assert.ok(restored);assert.equal(restored.currentHp,2);assert.equal(s.game.world.nativeFields[id],undefined);
});

for(const [id]of Object.entries(registry.fields).filter(([,m])=>m.dungeon))test(`${id}: an existing active room migrates once at the real interior arrival without recreating its wounded actors`,()=>{
 const {s}=hero(id),targetMobId=LOCATION_LEVELS[id].floors.flatMap(f=>f.rooms).flatMap(r=>r.spawns)[0].id;
 assert.ok(enterHuntField(s,id,{now:NOW,targetMobId}).ok);Object.assign(s.game.world,{mode:'location',location:id});
 const old=actors(s);assert.ok(old.length);old[0].currentHp=2;quiet(s);const saved=old.map(m=>({id:m.instanceId,hp:m.currentHp})),inventory=JSON.stringify(s.game.inventory);
 assert.equal(s.game.hunt.field.native,undefined);worldState(s,NOW);
 assert.deepEqual(nativeActorPoint(s.game.hunt.field),data.zones[id].outside.targets[0].point);
 assert.equal(s.game.hunt.field.native.legacyArrival,'source-dungeon-teleport');
 for(const m of saved){const found=actors(s).filter(a=>a.instanceId===m.id);assert.equal(found.length,1);assert.equal(found[0].currentHp,m.hp);}
 assert.equal(JSON.stringify(s.game.inventory),inventory);
 const point=nativeActorPoint(s.game.hunt.field);s.game.hunt.field.x+=16/ROOM_SIZE;const moved=nativeActorPoint(s.game.hunt.field);assert.notDeepEqual(moved,point);worldState(s,NOW+1);assert.deepEqual(nativeActorPoint(s.game.hunt.field),moved);
});

for(const [id]of Object.entries(registry.fields).filter(([,m])=>m.dungeon))test(`${id}: room trails use source proposals and real elapsed movement, including serialized return to the gate`,()=>{
 const d=data.zones[id];let {s,chat}=hero(id),now=NOW;
 assert.ok(worldAction(s,{action:'quick_travel',location:id},now).ok);gate(s,1,++now);
 if(!nativeFloorGuides(s.game.hunt)[0].near){assert.ok(worldAction(s,{action:'native_guide',npcId:d.inside.npcId},++now).ok);now=s.game.hunt.field.native.journey.until+1;advanceWorld(s,now);quiet(s);}
 const routes=npcRoutes.zones[id].filter(r=>r.witness),farRooms=[];
 for(const room of nativeFieldRooms(id)){
  const slot=room.spawns[0];if(!slot)continue;let state=42;
  const p=sampleNativeTerritory(nativeTerritorySource(id,slot),{random:()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296)});
  if(Math.hypot(p.x-d.inside.point.x,p.y-d.inside.point.y,p.z-d.inside.point.z)>250)farRooms.push(room.id);
 }
 assert.deepEqual(new Set(routes.map(r=>r.witness.room)),new Set(farRooms),'empty source partitions and already-near samples need no invented route');
 for(const r of routes){
  const slot=nativeFieldRooms(id).find(room=>room.id===r.witness.room).spawns[0];let state=r.witness.seed;
  const p=sampleNativeTerritory(nativeTerritorySource(id,slot),{random:()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296)});
  assert.equal(r.witness.originalEntrance,null);assert.deepEqual({x:r.from.x,y:r.from.y,z:r.from.z},{x:p.x,y:p.y,z:worldGeodata.point(p).z});
 }
 const route=routes.toSorted((a,b)=>b.path.length-a.path.length)[0],vertices=[route.from,...route.path].reverse().slice(1,5);let travelled=0;
 for(const goal of vertices){
  const from=nativeActorPoint(s.game.hunt.field);if(Math.hypot(goal.x-from.x,goal.y-from.y)<1)continue;
  assert.ok(worldAction(s,{action:'native_move',point:{...goal,z:1e9}},++now).ok);assert.deepEqual(nativeActorPoint(s.game.hunt.field),from);
  const trip=s.game.hunt.field.native.journey;let previous=trip.native.point;for(const p of trip.native.path){assert.ok(nativeSegment(previous,p,{allowed:nativeGroundAllowed,reversible:true}));previous=p;}
  const until=trip.until;now+=Math.max(1,Math.floor((until-now)/2));advanceWorld(s,now);quiet(s);
  s=JSON.parse(JSON.stringify(s));s.ownerDocument=()=>chat;now=until+1;advanceWorld(s,now);quiet(s);
  const reached=nativeActorPoint(s.game.hunt.field);assert.equal(reached.x,goal.x);assert.equal(reached.y,goal.y);assert.notEqual(reached.z,1e9);travelled+=Math.hypot(goal.x-from.x,goal.y-from.y);
 }
 assert.ok(travelled>400);
 assert.ok(worldAction(s,{action:'native_guide',npcId:d.inside.npcId},++now).ok);now=s.game.hunt.field.native.journey.until+1;advanceWorld(s,now);quiet(s);assert.ok(nativeFloorGuides(s.game.hunt)[0].near);gate(s,0,++now);
});
