import {nativeTerritoryGround,nativeTerritorySource,sampleNativeTerritory} from '../functions/game/world/nativeSpawnTerritory.js';
import {nativeFieldEntryVisible,nativeTerritoryFloorRoom} from '../functions/game/world/nativeFieldSpace.js';
import {worldGeodata} from '../functions/game/world/l2jGeodata.js';
import test from 'node:test';import assert from 'node:assert/strict';
import policy from '../template/nativeFieldPilot.js';import levels from '../template/nativeLevelRoutes.js';import {LOCATION_LEVELS} from '../template/locationLevels.js';
import {nativeRoute} from '../functions/game/world/nativeTravel.js';import {nativeFieldRooms} from '../functions/game/world/nativeFieldRooms.js';
import {nativeFieldBuckets,nativeActorPoint,activateNativeField,nativeCombatLine} from '../functions/game/world/nativeFieldSpace.js';
import {worldAction,advanceWorld,worldState} from '../functions/game/world/world.js';import {ensureHunt,enterHuntField,selectHuntTarget,setHuntAttack,advanceHunt} from '../functions/game/hunt/huntFight.js';
import {getHuntState} from '../miniapp/hunt.js';import {nativeSegment} from '../functions/game/world/nativeNavigation.js';import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
import change from '../functions/game/player/changePlayerGameClass.js';import update from '../functions/game/player/updatePlayerStats.js';
const START=1800000000000,id='forge-of-the-gods',source=levels.zones[id],actors=s=>nativeFieldBuckets(s.game.hunt?.field).flatMap(b=>b.mobs||[]);
function hero(city='goddard'){const s={userId:1,userChatData:{user:{id:1,first_name:'Test'}},game:{stats:{lvl:85,currentExp:0},inventory:{gold:1e6,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city,x:.5,y:.5,path:[],moveAt:START,locks:{}}}};const chat={game:{},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);return s;}
const quiet=s=>{for(const m of actors(s))Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:START+1e12});};
function enter(s,zone=id){assert.equal(worldAction(s,{action:'walk_location',location:zone},START).ok,true);const now=s.game.world.walkHome.until+1;advanceWorld(s,now);quiet(s);return now;}
function walk(s,floor,now){assert.equal(worldAction(s,{action:'native_floor',floor,z:999999,point:{x:0,y:0}},now).ok,true);const trip=s.game.hunt.field.native.journey;now=trip.until+1;advanceWorld(s,now);quiet(s);return now;}
test('Forge registers 460 upper and 264 lower source slots with independent room keys',()=>{
 assert.deepEqual(policy.fields[id].floors,[1,2]);assert.equal(policy.fields[id].fixedCount,724);
 const rooms=nativeFieldRooms(id);assert.equal(new Set(rooms.map(r=>r.id)).size,rooms.length);
 for(const floor of [1,2]){const raw=LOCATION_LEVELS[id].floors.find(f=>f.number===floor),mapped=rooms.filter(r=>r.sourceFloor===floor);assert.equal(mapped.length,raw.rooms.length);assert.equal(mapped.flatMap(r=>r.spawns).reduce((n,s)=>n+s.count,0),floor===1?460:264);for(const room of mapped){assert.match(room.id,new RegExp('^f'+floor+'/r'));assert.deepEqual(room.spawns,raw.rooms.find(r=>room.id.endsWith('/'+r.id)).spawns);}}
});
test('the Forge level route crosses original layers in both directions and never changes a source NPC endpoint',()=>{
 const lower=source.levels[2],raw=LOCATION_LEVELS[id].floors[1].rooms.flatMap(r=>r.spawns||[]).find(s=>s.id===lower.source.id&&s.x===lower.source.x&&s.y===lower.source.y&&s.z===lower.source.z);assert.ok(raw);
 assert.deepEqual(source.root,nativeRoute(id).to);assert.equal(lower.to.x,raw.x);assert.equal(lower.to.y,raw.y);assert.ok(source.root.z-lower.to.z>1900);
 let previous=source.root;for(const p of lower.path){assert.ok(nativeSegment(previous,p,{allowed:nativeGroundAllowed,reversible:true}));previous=p;}assert.deepEqual(previous,lower.to);
});
test('saved physical descent and ascent retain both banks, HP and one movement budget',async()=>{
 let s=hero(),now=enter(s);assert.ok(actors(s).some(m=>m.sourceFloor===1));assert.ok(actors(s).some(m=>m.sourceFloor===2));
 const marked=[1,2].map(floor=>{const m=actors(s).find(m=>m.sourceFloor===floor);m.currentHp=Math.floor(m.hp/2);return {id:m.instanceId,hp:m.currentHp};});
 const from=nativeActorPoint(s.game.hunt.field);assert.equal(worldAction(s,{action:'floor',floor:2},now).ok,false);assert.equal(worldAction(s,{action:'native_floor',floor:99},now).ok,false);assert.deepEqual(nativeActorPoint(s.game.hunt.field),from);
 assert.equal(worldAction(s,{action:'native_floor',floor:2,z:999999},now).ok,true);const trip=s.game.hunt.field.native.journey;assert.deepEqual(nativeActorPoint(s.game.hunt.field),from);
 const halfway=now+Math.floor((trip.until-now)*.5),saved=JSON.parse(JSON.stringify(s));advanceWorld(s,halfway);quiet(s);advanceWorld(saved,halfway);quiet(saved);assert.deepEqual(nativeActorPoint(s.game.hunt.field),nativeActorPoint(saved.game.hunt.field));
 now=trip.until+1;s=JSON.parse(JSON.stringify(saved));advanceWorld(s,now);quiet(s);assert.deepEqual(nativeActorPoint(s.game.hunt.field),source.levels[2].to);assert.equal((await getHuntState(s,now)).field.native.floor,2);
 for(const m of marked){assert.equal(actors(s).filter(a=>a.instanceId===m.id).length,1);assert.equal(actors(s).find(a=>a.instanceId===m.id).currentHp,m.hp);}
 now=walk(s,1,now+1);assert.deepEqual(nativeActorPoint(s.game.hunt.field),source.root);assert.equal((await getHuntState(s,now)).field.native.floor,1);assert.equal(s.game.inventory.gold,1e6);
 const keys=actors(s).map(m=>m.sourceRoom+':'+m.sourceSlot);assert.equal(new Set(keys).size,keys.length);
});
test('a lower level kill reserves the correct floor slot and respawns there after serialization',()=>{
 const s=hero();let now=enter(s);now=walk(s,2,now+1);
 const field=s.game.hunt.field,mob=actors(s).find(m=>m.sourceFloor===2&&Math.hypot(m.x-field.x,m.y-field.y)<.001&&nativeCombatLine(field,m));assert.ok(mob);
 assert.equal(selectHuntTarget(s,mob.instanceId,now).ok,true);mob.currentHp=1;assert.equal(setHuntAttack(s,true,now).ok,true);advanceHunt(s,now+2000,()=>.99);assert.equal(s.game.hunt.kills,1);
 const pending=field.respawns.find(r=>r.room===mob.sourceRoom&&r.sourceSlot===mob.sourceSlot);assert.ok(pending);assert.match(pending.room,/^f2\//);
 const saved=JSON.parse(JSON.stringify(s));advanceHunt(saved,pending.at+1,()=>.99);quiet(saved);const replacement=actors(saved).find(m=>m.sourceRoom===mob.sourceRoom&&m.sourceSlot===mob.sourceSlot);assert.ok(replacement);assert.equal(replacement.sourceFloor,2);assert.deepEqual(replacement.sourcePosition,mob.sourcePosition);assert.notEqual(replacement.instanceId,mob.instanceId);assert.equal(saved.game.hunt.kills,1);
});
test('legacy floor banks migrate together without duplicating cached actors or resetting HP',()=>{
 const s=hero(),lower=hero();assert.equal(enterHuntField(s,id,{now:START,floor:1,targetMobId:"22634",random:()=>.5}).ok,true);assert.equal(enterHuntField(lower,id,{now:START+1,floor:2,targetMobId:"22647",random:()=>.5}).ok,true);
 const f=s.game.hunt.field,second=lower.game.hunt.field;assert.ok(f.mobs.length&&second.mobs.length);const marked=[f.mobs[0],second.mobs[0]].map(m=>{m.currentHp=Math.floor(m.hp/2);return {id:m.instanceId,hp:m.currentHp};});f.floorStates={2:second};
 Object.assign(s.game.world,{mode:'location',location:id});assert.equal(activateNativeField(s.game.hunt,source.root,START+2),true);ensureHunt(s,START+2,()=>.5);quiet(s);assert.deepEqual(f.floorStates,{});
 for(const m of marked){const copies=actors(s).filter(a=>a.instanceId===m.id);assert.equal(copies.length,1);assert.equal(copies[0].currentHp,m.hp);}
 const keys=actors(s).map(m=>m.sourceRoom+':'+m.sourceSlot);assert.equal(new Set(keys).size,keys.length);
 assert.equal(worldAction(s,{action:'quick_travel',city:'goddard'},START+3).ok,true);assert.equal(worldAction(s,{action:'walk_location',location:id},START+4).ok,true);const end=s.game.world.walkHome.until+1;advanceWorld(s,end);quiet(s);
 for(const m of marked){const copies=actors(s).filter(a=>a.instanceId===m.id);assert.equal(copies.length,1);assert.equal(copies[0].currentHp,m.hp);}
 assert.equal(s.game.world.nativeFields[id],undefined);assert.ok(worldState(s,end).nativeField);
});

test('an outside teleport can start the checked descent and a paused level path resumes its original raster',()=>{
 let s=hero();s.game.isNoble=true;assert.equal(worldAction(s,{action:'quick_travel',location:id},START).ok,true);quiet(s);assert.deepEqual(nativeActorPoint(s.game.hunt.field),nativeRoute(id).entry);const gold=s.game.inventory.gold;
 assert.equal(worldAction(s,{action:'native_floor',floor:2},START+1).ok,true);const trip=s.game.hunt.field.native.journey,at=START+Math.floor((trip.until-START)*.6);advanceWorld(s,at);quiet(s);
 assert.equal(worldAction(s,{action:'native_stop'},at).ok,true);const point=nativeActorPoint(s.game.hunt.field),paused=s.game.hunt.field.native.floorResume;assert.ok(paused?.native.remaining>0);assert.equal(s.game.hunt.field.native.journey,undefined);
 s=JSON.parse(JSON.stringify(s));assert.equal(worldAction(s,{action:'native_floor',floor:2},at+5000).ok,true);const resumed=s.game.hunt.field.native.journey;
 assert.deepEqual(nativeActorPoint(s.game.hunt.field),point);assert.deepEqual(resumed.native.legStart,paused.native.legStart);assert.equal(resumed.native.index,paused.native.index);assert.equal(resumed.native.remaining,paused.native.remaining);
 advanceWorld(s,resumed.until+1);quiet(s);assert.deepEqual(nativeActorPoint(s.game.hunt.field),source.levels[2].to);assert.equal(s.game.inventory.gold,gold);
});

test('all 724 reviewed source slots fit one saved bank and survive departure without rerolls',()=>{
 const s=hero();const now=enter(s);
 // Load each reviewed source neighborhood; this audits persistence, not movement.
 for(const room of nativeFieldRooms(id)){const p=room.spawns[0];if(p){activateNativeField(s.game.hunt,worldGeodata.point(p),now);ensureHunt(s,now);quiet(s);}}
 const all=actors(s);assert.equal(all.filter(m=>!m.sourceMinion).length,724);const remembered=all.map(m=>({id:m.instanceId,room:m.sourceRoom,slot:m.sourceSlot}));const marked=all.find(m=>m.sourceFloor===2);marked.currentHp=Math.floor(marked.hp/2);const hp=marked.currentHp;
 assert.ok(Buffer.byteLength(JSON.stringify(s.game.hunt.field))<2*1024*1024);
 assert.equal(worldAction(s,{action:'quick_travel',city:'goddard'},now+1).ok,true);assert.equal(worldAction(s,{action:'walk_location',location:id},now+2).ok,true);advanceWorld(s,s.game.world.walkHome.until+1);quiet(s);
 const restored=new Map(actors(s).map(m=>[m.instanceId,m]));assert.equal(restored.size,all.length);for(const m of remembered){assert.equal(restored.get(m.id).sourceRoom,m.room);assert.equal(restored.get(m.id).sourceSlot,m.slot);}assert.equal(restored.get(marked.instanceId).currentHp,hp);
});

test('Monastery source provenance, physical ascent, saved banks and return stay in one world space',async()=>{
 const zone='monastery-of-silence',model=levels.zones[zone],file='spawns/Others/23_15.xml',rooms=nativeFieldRooms(zone);
 assert.equal(policy.source.files[file],'fb6905618e655ed6258b6104967b89d33344ee8d35bb383c61b9f2012d8700cb');assert.equal(policy.fields[zone].fixedCount,202);
 for(const floor of [1,2]){const slots=rooms.filter(r=>r.sourceFloor===floor).flatMap(r=>r.spawns);assert.equal(slots.reduce((n,s)=>n+s.count,0),floor===1?130:72);assert.ok(slots.every(s=>s.file===file));}
 let before=model.root;for(const p of model.levels[2].path){assert.ok(nativeSegment(before,p,{allowed:nativeGroundAllowed,reversible:true}));before=p;}assert.deepEqual(before,model.levels[2].to);assert.ok(before.z-model.root.z>1700);
 let s=hero('rune'),now=enter(s,zone);const marked=actors(s).find(m=>m.sourceFloor===1);marked.currentHp=Math.floor(marked.hp/2);const kept={id:marked.instanceId,hp:marked.currentHp};
 const point=nativeActorPoint(s.game.hunt.field);assert.equal(worldAction(s,{action:'floor',floor:2},now).ok,false);assert.deepEqual(nativeActorPoint(s.game.hunt.field),point);
 assert.equal(worldAction(s,{action:'native_floor',floor:2},now).ok,true);const end=s.game.hunt.field.native.journey.until+1;s=JSON.parse(JSON.stringify(s));advanceWorld(s,end);quiet(s);assert.deepEqual(nativeActorPoint(s.game.hunt.field),model.levels[2].to);assert.equal((await getHuntState(s,end)).field.native.floor,2);
 now=walk(s,1,end+1);assert.deepEqual(nativeActorPoint(s.game.hunt.field),model.root);assert.equal(actors(s).find(m=>m.instanceId===kept.id).currentHp,kept.hp);assert.equal(s.game.inventory.gold,1e6);
 const keys=actors(s).map(m=>m.sourceRoom+':'+m.sourceSlot);assert.equal(new Set(keys).size,keys.length);
});

test('Giants Cave keeps original polygon quotas, descends through geodata, and resamples the owning lower slot',async()=>{
 const zone='giants-cave',model=levels.zones[zone],meta=policy.fields[zone];assert.equal(meta.fixedCount,99);assert.equal(meta.territoryCount,327);assert.equal(meta.count,426);
 let s=hero('aden'),now=enter(s,zone);const from=nativeActorPoint(s.game.hunt.field);assert.equal(worldAction(s,{action:'native_floor',floor:2},now).ok,true);assert.deepEqual(nativeActorPoint(s.game.hunt.field),from);const end=s.game.hunt.field.native.journey.until+1;s=JSON.parse(JSON.stringify(s));advanceWorld(s,end);quiet(s);now=end;
 assert.deepEqual(nativeActorPoint(s.game.hunt.field),model.levels[2].to);assert.equal((await getHuntState(s,now)).field.native.floor,2);
 const poly=actors(s).find(m=>m.sourceFloor===2&&m.sourceTerritory&&m.currentHp>0);assert.ok(poly);assert.equal(poly.sourcePlacement,'territory');
 // Combat persistence is checked at an existing valid spawn; level traversal
 // above independently verifies the actual player walk.
 activateNativeField(s.game.hunt,nativeActorPoint(poly),now);ensureHunt(s,now);quiet(s);const slot=poly.sourceSlot,room=poly.sourceRoom;poly.currentHp=1;
 assert.equal(selectHuntTarget(s,poly.instanceId,now).ok,true);assert.equal(setHuntAttack(s,true,now).ok,true);advanceHunt(s,now+2000,()=>.99);assert.equal(s.game.hunt.kills,1);const pending=s.game.hunt.field.respawns.find(r=>r.room===room&&r.sourceSlot===slot);assert.ok(pending);
 s=JSON.parse(JSON.stringify(s));let seed=42;advanceHunt(s,pending.at+1,()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296));quiet(s);
 const replacement=actors(s).find(m=>m.sourceRoom===room&&m.sourceSlot===slot);assert.ok(replacement);assert.equal(replacement.sourceFloor,2);assert.equal(replacement.sourcePlacement,'territory');assert.deepEqual(replacement.sourceTerritory,poly.sourceTerritory);assert.notEqual(replacement.instanceId,poly.instanceId);assert.equal(s.game.hunt.kills,1);
 const {pointInPolygon}=await import('../functions/game/world/navigation.js');assert.ok(pointInPolygon(replacement.sourcePosition,replacement.sourceTerritory.polygon));assert.ok(replacement.sourcePosition.z<=replacement.sourceTerritory.maxZ);assert.equal(nativeGroundAllowed(replacement.sourcePosition),true);
});

test('polygon cave residency checks the original area, selected layer and exclusions without a centroid witness',()=>{
 const zone='giants-cave',slot=nativeFieldRooms(zone).flatMap(r=>r.spawns).find(s=>s.coordinateSource!=='point'),area=nativeTerritorySource(zone,slot);let seed=42;
 const point=sampleNativeTerritory(area,{random:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)});assert.ok(point);assert.equal(nativeTerritoryGround(area,point),true);assert.equal(nativeFieldEntryVisible(point,zone),true);
 assert.equal(nativeTerritoryGround(area,{...point,z:point.z+4096}),false);
 assert.equal(nativeTerritoryGround(area,{...point,x:Math.max(...area.polygon.map(p=>p[0]))+16}),false);
 assert.equal(nativeTerritoryGround({...area,bannedTerritories:[{polygon:area.polygon,minZ:point.z,maxZ:point.z}]},point),false);
});

test('Imperial Tomb walks both source polygon floors and preserves its three random groups',async()=>{
 const zone='imperial-tomb',model=levels.zones[zone],meta=policy.fields[zone],rooms=nativeFieldRooms(zone);
 assert.equal(meta.fixedCount,0);assert.equal(meta.territoryCount,476);assert.equal(meta.initialCapacity,296);assert.equal(meta.randomGroupCount,3);
 for(const floor of [1,2]){
  const endpoint=model.levels[floor],witness=endpoint.source;assert.equal(witness.type,'TERRITORY_SAMPLE');assert.equal(witness.originalEntrance,null);
  assert.equal(witness.sha256,'85df4c0d480833505a8d6318231350cce6a24cf7a8d23e5500f776f3f062e024');
  let seed=witness.seed;const point=sampleNativeTerritory({...witness,bannedTerritories:[]},{random:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)});
  assert.deepEqual(point,endpoint.to);assert.equal(nativeTerritoryFloorRoom(zone,rooms,point)?.sourceFloor,floor);
  assert.equal(nativeTerritoryFloorRoom(zone,rooms,{...point,z:point.z+10000}),null);
 }
 let previous=model.root;for(const point of model.levels[2].path){assert.ok(nativeSegment(previous,point,{allowed:nativeGroundAllowed,reversible:true}));previous=point;}assert.deepEqual(previous,model.levels[2].to);assert.ok(model.root.z-previous.z>3000);
 let s=hero(),now=enter(s,zone);const remembered=actors(s).filter(m=>m.currentHp>0).slice(0,3).map(m=>{m.currentHp=Math.floor(m.hp/2);return {id:m.instanceId,hp:m.currentHp};});assert.ok(remembered.length);
 assert.equal((await getHuntState(s,now)).field.native.floor,1);const from=nativeActorPoint(s.game.hunt.field);
 assert.equal(worldAction(s,{action:'native_floor',floor:2},now).ok,true);assert.deepEqual(nativeActorPoint(s.game.hunt.field),from);const end=s.game.hunt.field.native.journey.until+1;s=JSON.parse(JSON.stringify(s));advanceWorld(s,end);quiet(s);
 assert.deepEqual(nativeActorPoint(s.game.hunt.field),model.levels[2].to);assert.equal((await getHuntState(s,end)).field.native.floor,2);
 now=walk(s,1,end+1);for(const m of remembered)assert.equal(actors(s).find(a=>a.instanceId===m.id)?.currentHp,m.hp);
 const choices=structuredClone(s.game.hunt.field.native.randomGroups);s=JSON.parse(JSON.stringify(s));ensureHunt(s,now);quiet(s);assert.deepEqual(s.game.hunt.field.native.randomGroups,choices);
 const slots=actors(s).map(m=>m.sourceRoom+':'+m.sourceSlot);assert.equal(new Set(slots).size,slots.length);
 for(const group of ['godard14_2515_15','godard14_2515_16','godard14_2515_17']){
  const room=rooms.find(r=>r.spawns.some(p=>p.randomGroup===group)),slot=room.spawns.find(p=>p.randomGroup===group);let state=42;
  const p=sampleNativeTerritory(nativeTerritorySource(zone,slot),{random:()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296)});assert.ok(p);
  activateNativeField(s.game.hunt,p,now);ensureHunt(s,now);quiet(s);const members=actors(s).filter(m=>m.sourceRandomGroup===group);assert.equal(members.length,10);assert.equal(new Set(members.map(m=>m.mobId)).size,1);
 }
});

test('overlapping source areas cannot infer an ambiguous floor from a polygon centroid',()=>{
 const zone='imperial-tomb',rooms=nativeFieldRooms(zone),point=levels.zones[zone].root,matched=nativeTerritoryFloorRoom(zone,rooms,point);assert.ok(matched);
 assert.equal(nativeTerritoryFloorRoom(zone,[matched,{...matched,id:'f99/r0c0',sourceFloor:99}],point),null);
});

test('legacy Imperial alternatives retain an existing variant and pending timer without a fresh population roll',async()=>{
 const {migrateNativeRandomGroups}=await import('../functions/game/world/nativeFieldRooms.js');
 const {populationSlots}=await import('../functions/game/hunt/sourcePopulation.js');
 const zone='imperial-tomb',room=nativeFieldRooms(zone).find(r=>r.spawns.some(s=>s.randomGroup)),slots=populationSlots(room),group=room.spawns.find(s=>s.randomGroup).randomGroup,variants=slots.filter(s=>s.randomGroup===group),first=variants[0],other=variants.find(s=>s.entryIndex!==first.entryIndex);
 const field={mobs:[{instanceId:'kept',sourceRoom:room.id,sourceSlot:first.slot,currentHp:17},{instanceId:'excess',sourceRoom:room.id,sourceSlot:other.slot,currentHp:29}],rooms:{},respawns:[{room:room.id,sourceSlot:first.slot+1,at:START+12345},{room:room.id,sourceSlot:other.slot+1,at:START+54321}]};
 migrateNativeRandomGroups(field,zone);assert.deepEqual(field.mobs,[{instanceId:'kept',sourceRoom:room.id,sourceSlot:first.slot,currentHp:17,sourceRandomGroup:group}]);assert.deepEqual(field.respawns,[{room:room.id,sourceSlot:first.slot+1,at:START+12345}]);
 field.mobs.push({instanceId:'new-respawn',sourceRoom:room.id,sourceSlot:other.slot,currentHp:11,sourceRandomGroup:group});const saved=structuredClone(field);migrateNativeRandomGroups(field,zone);assert.deepEqual(field,saved);
});

test('Tower of Insolence climbs all thirteen public landings, survives saves and excludes Baium admission',async()=>{
 const zone='tower-of-insolence',model=levels.zones[zone],meta=policy.fields[zone],rooms=nativeFieldRooms(zone),counts=[48,65,60,56,50,40,20,17,24,10,20,8,0];
 assert.equal(meta.count,418);assert.equal(meta.initialCapacity,418);assert.deepEqual(meta.floors,Array.from({length:13},(_,i)=>i+1));
 for(const floor of meta.floors){assert.equal(rooms.filter(r=>r.sourceFloor===floor).flatMap(r=>r.spawns).reduce((n,s)=>n+s.count,0),counts[floor-1]);let before=model.root;for(const p of model.levels[floor].path){assert.ok(nativeSegment(before,p,{allowed:nativeGroundAllowed,reversible:true}));before=p;}assert.deepEqual(before,model.levels[floor].to);}
 assert.ok(rooms.every(r=>r.sourceFloor!==14));const vortex=model.levels[13].source;assert.equal(vortex.id,31862);assert.deepEqual([vortex.x,vortex.y,vortex.z],[112624,14032,10080]);assert.equal(vortex.sha256,'bd9dd19f54063bcde4703b26a351f93596b94786388a60d3a72b733dc63e52c6');
 let s=hero('aden'),now=enter(s,zone);const marked=actors(s)[0];marked.currentHp=Math.floor(marked.hp/2);const kept={id:marked.instanceId,hp:marked.currentHp};
 for(let floor=2;floor<=13;floor++){
  const from=nativeActorPoint(s.game.hunt.field);const result=worldAction(s,{action:'native_floor',floor,z:1e9},now);assert.equal(result.ok,true,'floor '+floor+' '+JSON.stringify(result));assert.deepEqual(nativeActorPoint(s.game.hunt.field),from);const trip=s.game.hunt.field.native.journey;
  s=JSON.parse(JSON.stringify(s));now=trip.until+1;advanceWorld(s,now);quiet(s);assert.deepEqual(nativeActorPoint(s.game.hunt.field),model.levels[floor].to);assert.equal((await getHuntState(s,now)).field.native.floor,floor);
 }
 assert.equal(nativeTerritoryFloorRoom(zone,rooms,nativeActorPoint(s.game.hunt.field))?.sourceFloor,13);
 assert.equal(worldAction(s,{action:'native_floor',floor:14},now).reason,'invalid_floor');assert.equal(worldAction(s,{action:'floor',floor:14},now).ok,false);assert.equal(s.game.world.instanceId,undefined);assert.equal(s.game.world.mode,'location');
 // A neighboring-floor return must retrace shared stair vertices, not score a
 // spurious root detour that exhausts the bounded local rejoin search.
 now=walk(s,12,now+1);assert.equal((await getHuntState(s,now)).field.native.floor,12);
 now=walk(s,1,now+1);assert.deepEqual(nativeActorPoint(s.game.hunt.field),model.root);
 now=walk(s,13,now+1);assert.deepEqual(nativeActorPoint(s.game.hunt.field),model.levels[13].to);now=walk(s,1,now+1);
 assert.equal(actors(s).find(m=>m.instanceId===kept.id)?.currentHp,kept.hp);assert.equal(s.game.inventory.gold,1e6);
 const keys=actors(s).map(m=>m.sourceRoom+':'+m.sourceSlot);assert.equal(new Set(keys).size,keys.length);
});
