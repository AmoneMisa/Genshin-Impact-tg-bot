import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleNativeTerritory,nativeTerritorySource} from '../functions/game/world/nativeSpawnTerritory.js';
import {pointInPolygon} from '../functions/game/world/navigation.js';
import {worldGeodata} from '../functions/game/world/l2jGeodata.js';
import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
import {LOCATION_LEVELS} from '../template/locationLevels.js';
import {worldAction,advanceWorld} from '../functions/game/world/world.js';
import {nativeActorPoint,nativeFieldBuckets} from '../functions/game/world/nativeFieldSpace.js';
import {findNativePath} from '../functions/game/world/nativeNavigation.js';
import {advanceHunt,selectHuntTarget,setHuntAttack} from '../functions/game/hunt/huntFight.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
const rng=(seed=42)=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const square={polygon:[[0,0],[10,0],[10,10],[0,10]],minZ:-101,maxZ:100};
test('territory sampling keeps source integer XY and selects the layer at the H5 Z midpoint',()=>{
 let input;const result=sampleNativeTerritory(square,{random:()=>.5,geo:{point:p=>(input=p,{...p,z:32,nswe:15})},allowed:()=>true});
 assert.deepEqual(result,{x:5,y:5,z:32});assert.equal(input.z===0,true);
 const slots=LOCATION_LEVELS['cruma-marshlands'].floors[0].rooms.flatMap(r=>r.spawns),random=rng();let count=0;
 for(const source of slots)for(let i=0;i<source.count;i++){
  const p=sampleNativeTerritory(source,{random});assert.ok(p);assert.ok(Number.isInteger(p.x)&&Number.isInteger(p.y));
  assert.ok(pointInPolygon(p,source.polygon));assert.ok(p.z<=source.maxZ);assert.ok(nativeGroundAllowed(p));
  assert.equal(p.z,worldGeodata.point({...p,z:Math.trunc((source.minZ+source.maxZ)/2)}).z);count++;
 }
 assert.equal(count,414);
});
test('exhausted polygon, water, excluded territory and height searches never fall back to a centroid',()=>{
 const geo={point:p=>({...p,z:32,nswe:15})};
 assert.equal(sampleNativeTerritory(square,{random:()=>1,geo}),null);
 let calls=0;
 assert.equal(sampleNativeTerritory({...square,polygon:[[0,0],[0,10],[1,0]]},{random:()=>{calls++;return .99;},geo}),null);
 assert.equal(calls,2002);
 assert.equal(sampleNativeTerritory(square,{random:()=>.5,geo,allowed:()=>false}),null);
 assert.equal(sampleNativeTerritory(square,{random:()=>.5,geo:{point:p=>({...p,z:104,nswe:15})}}),null);
 assert.deepEqual(sampleNativeTerritory(square,{random:()=>.5,geo:{point:p=>({...p,z:-104,nswe:15})},allowed:()=>true}),{x:5,y:5,z:-104});
 assert.equal(sampleNativeTerritory({...square,bannedTerritories:[square]},{random:()=>.5,geo,allowed:()=>true}),null);
});
test('the original Valley of Saints exclusion is imported and applied to real geodata proposals',()=>{
 const slot=LOCATION_LEVELS['valley-of-saints'].floors[0].rooms.flatMap(r=>r.spawns).find(s=>s.sourceGroup==='rune08_2215_19');
 const territory=nativeTerritorySource('valley-of-saints',slot),random=rng(983);
 assert.equal(territory.bannedTerritories.length,1);
 const banned=territory.bannedTerritories[0];assert.deepEqual(banned.polygon[0],[75988,-86364]);assert.equal(banned.minZ,-3705);assert.equal(banned.maxZ,-3105);
 for(let i=0;i<200;i++){const p=sampleNativeTerritory(territory,{random});assert.ok(p);assert.ok(p.z<banned.minZ||p.z>banned.maxZ||!pointInPolygon(p,banned.polygon));}
});
test('a native territory kill rewards once and respawns a new point in the same source territory and slot',()=>{
 const start=1800000000000,s={userId:1,userChatData:{user:{id:1,first_name:'Test'}},game:{stats:{lvl:40,currentExp:0},inventory:{gold:1e6,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:'dion',x:.5,y:.5,path:[],moveAt:start,locks:{}}}};
 const chat={game:{},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);
 const actors=()=>nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs||[]),quiet=now=>{for(const m of actors())Object.assign(m,{aggressive:false,aggro:false,aggroRange:0,nextAttackAt:now+1e9});};
 assert.equal(worldAction(s,{action:'walk_location',location:'cruma-marshlands'},start).ok,true);
 let now=s.game.world.walkHome.until+1;advanceWorld(s,now);quiet(now);
 const from=nativeActorPoint(s.game.hunt.field),mob=actors().sort((a,b)=>Math.hypot(a.x*2000-from.x,a.y*2000-from.y)-Math.hypot(b.x*2000-from.x,b.y*2000-from.y)).find(m=>findNativePath(from,nativeActorPoint(m),{allowed:nativeGroundAllowed,maxNodes:6000,stride:2,reversible:true}).ok);
 assert.ok(mob);const point=nativeActorPoint(mob),territory=mob.sourceTerritory;
 assert.equal(worldAction(s,{action:'native_move',point},now).ok,true);now=s.game.hunt.field.native.journey.until+1;advanceWorld(s,now);quiet(now);
 assert.equal(selectHuntTarget(s,mob.instanceId,now).ok,true);mob.currentHp=1;assert.equal(setHuntAttack(s,true,now).ok,true);
 advanceHunt(s,now+2000,()=>.99);assert.equal(s.game.hunt.kills,1);
 const pending=s.game.hunt.field.respawns.find(r=>r.room===mob.sourceRoom&&r.sourceSlot===mob.sourceSlot);assert.ok(pending);
 const saved=JSON.parse(JSON.stringify(s));advanceHunt(saved,pending.at+1,rng(918));
 const rejected=JSON.parse(JSON.stringify(s));advanceHunt(rejected,pending.at+1,()=>.999999);
 assert.equal(rejected.game.hunt.field.native.missing[mob.sourceRoom+':'+mob.sourceSlot],'source_ground_unavailable');
 assert.equal(nativeFieldBuckets(rejected.game.hunt.field).flatMap(b=>b.mobs||[]).some(m=>m.sourceRoom===mob.sourceRoom&&m.sourceSlot===mob.sourceSlot),false);
 const replacement=nativeFieldBuckets(saved.game.hunt.field).flatMap(b=>b.mobs||[]).find(m=>m.sourceRoom===mob.sourceRoom&&m.sourceSlot===mob.sourceSlot);
 assert.ok(replacement);assert.notEqual(replacement.instanceId,mob.instanceId);assert.ok(pointInPolygon(nativeActorPoint(replacement),territory.polygon));
 assert.notDeepEqual(replacement.sourcePosition,point);assert.equal(saved.game.hunt.kills,1);
});
