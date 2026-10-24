import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import ports from '../template/nativeFloorTransports.js';import npcRoutes from '../template/nativeNpcRoutes.js';import policy from '../template/nativeFieldPilot.js';
import {LOCATION_LEVELS} from '../template/locationLevels.js';
import {worldAction,advanceWorld,worldState} from '../functions/game/world/world.js';
import {nativeActorPoint,nativeFieldBuckets,activateNativeField} from '../functions/game/world/nativeFieldSpace.js';
import {nativeFloorGuides} from '../functions/game/world/nativeFloorTransports.js';
import {nativeLevelOptions} from '../functions/game/world/nativeLevelTravel.js';
import {nativeGroundAllowed as allowed} from '../functions/game/world/nativeGround.js';
import {nativeSegment} from '../functions/game/world/nativeNavigation.js';
import {worldGeodata} from '../functions/game/world/l2jGeodata.js';
import {getHuntState} from '../miniapp/hunt.js';
import change from '../functions/game/player/changePlayerGameClass.js';import update from '../functions/game/player/updatePlayerStats.js';
const START=1800000000000,zone='cruma-tower',model=ports.zones[zone];
const actors=s=>nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs||[]);
const quiet=s=>{for(const m of actors(s))Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:START+1e12});};
function hero(lvl=50){const s={userId:1,game:{stats:{lvl},inventory:{gold:1e6,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:'dion',x:.5,y:.5,path:[],moveAt:START,locks:{}}}};const chat={game:{},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);assert.equal(worldAction(s,{action:'walk_location',location:zone},START).ok,true);const now=s.game.world.walkHome.until+1;advanceWorld(s,now);quiet(s);return {s,now};}
function approach(s,id,now){if(nativeFloorGuides(s.game.hunt).find(g=>g.npcId===id)?.near)return now;const result=worldAction(s,{action:'native_guide',npcId:id},now);assert.equal(result.ok,true,JSON.stringify(result));const trip=s.game.hunt.field.native.journey;assert.ok(trip.native.remaining>0);now=trip.until+1;advanceWorld(s,now);quiet(s);assert.equal(nativeFloorGuides(s.game.hunt).find(g=>g.npcId===id).near,true);return now;}
function teleport(s,id,floor,now,index=0){const p=Object.values(model).flat().find(p=>p.npcId===id),t=p.targets[index],routeId=`${id}:${t.list}:${index}`;assert.equal(t.floor,floor);const result=worldAction(s,{action:'native_floor',floor,routeId,point:{x:0,y:0,z:0}},now);assert.equal(result.ok,true,JSON.stringify(result));assert.ok([t.point,...t.alternatives||[]].some(p=>['x','y','z'].every(k=>nativeActorPoint(s.game.hunt.field)[k]===p[k])));quiet(s);return now+1;}
test('Cruma retains all source spawn places, six original NPCs and seven exact routes including guarded Core approach',()=>{
 assert.equal(policy.fields[zone].count,330);assert.equal(Object.values(model).flat().length,6);assert.equal(Object.values(model).flat().reduce((n,p)=>n+p.targets.length,0),7);
 assert.equal(model.entrance[0].maxLevel,55);assert.equal(model[3][0].targets[1].scenarioRequired,'core');
 for(const p of Object.values(model).flat())for(const t of p.targets){assert.equal(t.fee,0);assert.equal(t.source.sha256,ports.source.files[t.source.file]);assert.equal(p.normal,false);assert.deepEqual(p.castleIds,[]);}
 assert.equal(LOCATION_LEVELS[zone].floors.flatMap(f=>f.rooms.flatMap(r=>r.spawns)).every(s=>s.file==='spawns/Others/20_21.xml'),true);
 assert.equal(npcRoutes.transportSha256,createHash('sha256').update(fs.readFileSync('template/nativeFloorTransports.js','utf8').replace(/\r\n/g,'\n')).digest('hex'));
 for(const r of npcRoutes.zones[zone]){let before=r.from;for(const p of r.path){assert.ok(nativeSegment(before,p,{allowed,reversible:true}));before=p;}assert.ok(r.path.length<=384);}
});
test('Mozella admits both original random destinations through level 55, rejects 56 and has no invented karma restriction',()=>{
 for(const lvl of [55,56]){const {s,now}=hero(lvl);assert.equal(s.game.hunt.field.native.outside,true);const before=nativeActorPoint(s.game.hunt.field);s.game.karma=1;
  const r=worldAction(s,{action:'native_floor',floor:1},now);assert.equal(r.ok,lvl===55);if(lvl===56){assert.equal(r.reason,'npc_level_limit');assert.deepEqual(nativeActorPoint(s.game.hunt.field),before);}else assert.equal(s.game.hunt.field.native.outside,false);
  assert.equal(s.game.inventory.gold,1e6);
 }
});
test('Mozella keeps both original random entry points without replacing them by a midpoint',()=>{
 const original=Math.random;
 try{for(const [random,target] of [[0,model.entrance[0].targets[0].point],[.999,model.entrance[0].targets[0].alternatives[0]]]){
  const {s,now}=hero();Math.random=()=>random;assert.equal(worldAction(s,{action:'native_floor',floor:1},now).ok,true);assert.deepEqual(nativeActorPoint(s.game.hunt.field),target);Math.random=original;
 }}finally{Math.random=original;}
});
test('Cruma visits all public floors through their distinct nearby NPCs, walks the second floor, saves HP and returns outside',async()=>{
 let {s,now}=hero();assert.ok((await getHuntState(s,now)).field.native.outside);now=teleport(s,30483,1,now);
 const victim=actors(s)[0];assert.ok(victim);victim.currentHp=Math.floor(victim.hp/2);const kept={id:victim.instanceId,hp:victim.currentHp};
 assert.deepEqual(worldState(s,now).nativeWalkCities,[]);assert.equal(worldAction(s,{action:'native_walk_city',city:'dion'},now).reason,'npc_floor_exit_required');
 now=teleport(s,30487,2,now);assert.equal(s.game.hunt.field.native.sourceFloor,2);assert.equal(nativeFloorGuides(s.game.hunt).length,2);
 assert.equal(worldAction(s,{action:'native_floor',floor:3},now).reason,'npc_too_far');assert.equal(worldAction(s,{action:'native_guide',npcId:30483},now).reason,'unknown_npc');
 const before=nativeActorPoint(s.game.hunt.field);assert.equal(worldAction(s,{action:'native_guide',npcId:30486},now).ok,true);assert.deepEqual(nativeActorPoint(s.game.hunt.field),before);assert.ok(s.game.hunt.field.native.journey.native.remaining>10000);
 s=JSON.parse(JSON.stringify(s));now=s.game.hunt.field.native.journey.until+1;advanceWorld(s,now);quiet(s);assert.equal(nativeFloorGuides(s.game.hunt).find(g=>g.npcId===30486).near,true);
 now=teleport(s,30486,3,now);assert.equal(s.game.hunt.field.native.sourceFloor,3);assert.ok((await getHuntState(s,now)).field.native.levels.some(r=>r.routeId==='31843:OTHER:1'&&!r.enabled));
 assert.equal(worldAction(s,{action:'native_floor',floor:3,routeId:'31843:OTHER:1'},now).reason,'epic_entry_required');assert.equal(worldAction(s,{action:'native_floor',floor:2,routeId:'30485:OTHER:0'},now).reason,'invalid_floor');
 now=teleport(s,31843,2,now);now=approach(s,30485,now);now=teleport(s,30485,1,now);now=approach(s,30484,now);now=teleport(s,30484,0,now);
 assert.equal(s.game.hunt.field.native.outside,true);assert.ok(worldState(s,now).nativeWalkCities.includes('dion'));assert.equal(s.game.inventory.gold,1e6);assert.equal(actors(s).find(m=>m.instanceId===kept.id).currentHp,kept.hp);
 assert.equal(worldAction(s,{action:'native_walk_city',city:'dion'},now).ok,true);now=s.game.world.walkHome.until+1;advanceWorld(s,now);assert.equal(s.game.world.mode,'city');
});
test('nearby original NPC interaction rejects cast/store state and stacked floor spoofing without changing position',()=>{
 const {s,now}=hero();const start=nativeActorPoint(s.game.hunt.field);s.game.storeMode=true;assert.equal(worldAction(s,{action:'native_floor',floor:1},now).reason,'npc_interaction_blocked');delete s.game.storeMode;
 activateNativeField(s.game.hunt,{...start,z:-11671},now);s.game.hunt.field.native.outside=true;assert.equal(worldAction(s,{action:'native_floor',floor:1},now).reason,'npc_too_far');assert.equal(s.game.inventory.gold,1e6);
 assert.equal(nativeLevelOptions(s.game.hunt).find(t=>t.floor===1).enabled,false);assert.ok(worldGeodata.point(start));
});
