import test from 'node:test';import assert from 'node:assert/strict';
import ports from '../template/nativeFloorTransports.js';import policy from '../template/nativeFieldPilot.js';
import {MISSING_WORLD_SOURCE} from '../docs/missing-world-sources.js';
import {worldAction,advanceWorld,worldState} from '../functions/game/world/world.js';
import {nativeActorPoint,nativeFieldBuckets,activateNativeField,nativeFieldEntryVisible} from '../functions/game/world/nativeFieldSpace.js';
import {nativeFloorGuide,nativeFloorTeleport} from '../functions/game/world/nativeFloorTransports.js';
import {findNativePath} from '../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
import {worldGeodata} from '../functions/game/world/l2jGeodata.js';
import {nativeLevelOptions} from '../functions/game/world/nativeLevelTravel.js';
import {withTeleportSieges} from '../functions/game/world/teleportSieges.js';
import {getHuntState} from '../miniapp/hunt.js';
import {ensureHunt} from '../functions/game/hunt/huntFight.js';
import change from '../functions/game/player/changePlayerGameClass.js';import update from '../functions/game/player/updatePlayerStats.js';
const START=1800000000000,zone='ivory-tower',actors=s=>nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs||[]);
function hero(){const s={userId:1,game:{stats:{lvl:50},inventory:{gold:1e6,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:'oren',x:.5,y:.5,path:[],moveAt:START,locks:{}}}};const chat={game:{},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);return s;}
const quiet=s=>{for(const m of actors(s))Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:START+1e12});};
function enter(s){assert.equal(worldAction(s,{action:'walk_location',location:zone},START).ok,true);const end=s.game.world.walkHome.until+1;advanceWorld(s,end);quiet(s);return end;}
test('Ivory keeps all twenty exact source destinations, proper NORMAL/OTHER lists and original NPC coordinates',()=>{
 assert.equal(policy.fields[zone].count,355);assert.equal(ports.interactionDistance,250);let count=0;
 for(const [floor,p] of Object.entries(ports.zones[zone])){assert.equal(p.targets.length,4);assert.equal(p.normal,Number(floor)!==3);for(const t of p.targets){count++;assert.equal(t.fee,0);assert.equal(t.source.sha256,MISSING_WORLD_SOURCE.files[t.source.file]);assert.equal(t.list,p.normal?'NORMAL':'OTHER');assert.notEqual(t.floor,Number(floor));}}
 assert.equal(count,20);assert.deepEqual(ports.zones[zone][5].targets.find(t=>t.floor===3).point,{x:85399,y:16197,z:-3674});
});
test('all five peaceful Ivory floors teleport through their real nearby NPC, keep source XYZ and preserve the same bank',async()=>{
 let s=hero(),now=enter(s);assert.equal(s.game.hunt.field.native.sourceFloor,3);assert.equal(nativeFloorGuide(s.game.hunt).name,'Verona');assert.equal(nativeFieldEntryVisible(nativeActorPoint(s.game.hunt.field),zone),true);
 const marked=actors(s)[0];assert.ok(marked);marked.currentHp=Math.floor(marked.hp/2);const kept={id:marked.instanceId,hp:marked.currentHp};
 await withTeleportSieges(s,[],async()=>{
  for(const floor of [2,4,5,6,3]){const fromFloor=s.game.hunt.field.native.sourceFloor,target=ports.zones[zone][fromFloor].targets.find(t=>t.floor===floor);assert.equal(nativeLevelOptions(s.game.hunt).find(o=>o.floor===floor).enabled,true);assert.equal(worldAction(s,{action:'native_floor',floor,point:{x:0,y:0,z:0},npc:9999},++now).ok,true);assert.deepEqual(nativeActorPoint(s.game.hunt.field),target.point);assert.equal(s.game.hunt.field.native.journey,undefined);assert.equal((await getHuntState(s,now)).field.native.floor,floor);quiet(s);}
 });
 s=JSON.parse(JSON.stringify(s));ensureHunt(s,now);quiet(s);assert.equal(actors(s).find(m=>m.instanceId===kept.id).currentHp,kept.hp);assert.equal(s.game.inventory.gold,1e6);
 const keys=actors(s).map(m=>m.sourceRoom+':'+m.sourceSlot);assert.equal(new Set(keys).size,keys.length);
});
test('Ivory denies a cross-floor interaction, absent siege authority, karma and casting without moving or charging',async()=>{
 const s=hero();let now=enter(s);assert.equal(worldAction(s,{action:'native_floor',floor:4},++now).ok,true);const point=nativeActorPoint(s.game.hunt.field);
 assert.deepEqual(worldState(s,now).nativeWalkCities,[]);assert.deepEqual(worldState(s,now).nativeWalk,{});assert.equal(worldAction(s,{action:'native_walk_city',city:'oren'},++now).reason,'npc_floor_exit_required');
 assert.equal(worldAction(s,{action:'native_floor',floor:5},++now).reason,'quick_travel_siege');
 await withTeleportSieges(s,[{_id:'castle:4',siege:{startsAt:now-1000,endsAt:now+10000}}],()=>assert.equal(worldAction(s,{action:'native_floor',floor:5},++now).reason,'quick_travel_siege'));
 await withTeleportSieges(s,[],()=>{s.game.karma=1;assert.equal(worldAction(s,{action:'native_floor',floor:5},++now).reason,'karma_gatekeeper');delete s.game.karma;s.game.sitting=true;assert.equal(worldAction(s,{action:'native_floor',floor:5},++now).reason,'npc_interaction_blocked');delete s.game.sitting;});
 s.game.hunt.field.action={index:0};assert.equal(nativeFloorTeleport(s,5,now).reason,'npc_interaction_blocked');delete s.game.hunt.field.action;
 assert.deepEqual(nativeActorPoint(s.game.hunt.field),point);assert.equal(s.game.inventory.gold,1e6);
 activateNativeField(s.game.hunt,{...point,z:point.z-516},now);s.game.hunt.field.native.sourceFloor=4;
 assert.equal(worldAction(s,{action:'native_floor',floor:5},++now).reason,'npc_too_far');
});
test('approaching an Ivory teleporter walks to its server-owned NPC and enables the free destination only within 250 units',async()=>{
 const s=hero();let now=enter(s),from=nativeActorPoint(s.game.hunt.field),goal;
 for(const [dx,dy] of [[400,0],[-400,0],[0,400],[0,-400]]){const p={x:from.x+dx,y:from.y+dy,z:from.z};if(findNativePath(from,p,{allowed:nativeGroundAllowed,maxNodes:6000,stride:2,reversible:true,heuristicWeight:2}).ok){goal=p;break;}}
 assert.ok(goal);assert.equal(worldAction(s,{action:'native_move',point:goal},now).ok,true);now=s.game.hunt.field.native.journey.until+1;advanceWorld(s,now);quiet(s);assert.equal(nativeFloorGuide(s.game.hunt).near,false);
 const stopped=nativeActorPoint(s.game.hunt.field);assert.equal(nativeLevelOptions(s.game.hunt).find(p=>p.floor===4).enabled,false);assert.equal(worldAction(s,{action:'native_floor',floor:4},++now).reason,'npc_too_far');
 assert.equal(worldAction(s,{action:'native_guide',npc:999,point:{x:0,y:0,z:1e9}},++now).ok,true);assert.deepEqual(nativeActorPoint(s.game.hunt.field),stopped);const trip=s.game.hunt.field.native.journey;assert.ok(trip.native.remaining>0);
 const saved=JSON.parse(JSON.stringify(s));now=trip.until+1;advanceWorld(saved,now);quiet(saved);assert.equal(nativeFloorGuide(saved.game.hunt).near,true);assert.equal(nativeLevelOptions(saved.game.hunt).find(p=>p.floor===4).enabled,true);assert.equal(worldAction(saved,{action:'native_floor',floor:4},++now).ok,true);assert.equal(saved.game.inventory.gold,1e6);
});
test('the crater and lobby share a reversible walk; peaceful teleport floors cannot be selected as walking height shortcuts',async()=>{
 const s=hero();let now=enter(s),start=nativeActorPoint(s.game.hunt.field);assert.equal(worldAction(s,{action:'native_floor',floor:1},now).ok,true);assert.deepEqual(nativeActorPoint(s.game.hunt.field),start);const trip=s.game.hunt.field.native.journey;assert.ok(trip.native.remaining>0);now=trip.until+1;advanceWorld(s,now);quiet(s);assert.equal(s.game.hunt.field.native.sourceFloor,1);assert.ok((await getHuntState(s,now)).field.mobs.length>0);
 assert.equal(worldAction(s,{action:'native_floor',floor:6},now).reason,'invalid_floor');assert.equal(worldAction(s,{action:'floor',floor:6},now).ok,false);
 assert.equal(worldAction(s,{action:'native_floor',floor:3},++now).ok,true);now=s.game.hunt.field.native.journey.until+1;advanceWorld(s,now);quiet(s);assert.deepEqual(nativeActorPoint(s.game.hunt.field),{...start,z:worldGeodata.point(start).z});assert.equal(s.game.hunt.field.native.sourceFloor,3);
});
test('fallback direction steps use the current server point and ignore stale client coordinates and heights',()=>{
 const s=hero(),now=enter(s),point=nativeActorPoint(s.game.hunt.field);
 const direction=[['east',200,0],['west',-200,0],['south',0,200],['north',0,-200]].find(([,dx,dy])=>findNativePath(point,{x:point.x+dx,y:point.y+dy,z:point.z},{allowed:nativeGroundAllowed,maxNodes:6000,stride:2,reversible:true,heuristicWeight:2}).ok);assert.ok(direction);
 assert.equal(worldAction(s,{action:'native_step',direction:direction[0],point:{x:-999999,y:999999,z:1e9}},now).ok,true);const end=s.game.hunt.field.native.journey.native.path.at(-1);assert.equal(end.x,point.x+direction[1]);assert.equal(end.y,point.y+direction[2]);assert.ok(Math.abs(end.z-point.z)<100);
 const old=s.game.hunt.field.native.journey;assert.equal(worldAction(s,{action:'native_step',direction:'upstairs'},now).reason,'invalid_move');assert.equal(s.game.hunt.field.native.journey,old);assert.equal(s.game.inventory.gold,1e6);
});
