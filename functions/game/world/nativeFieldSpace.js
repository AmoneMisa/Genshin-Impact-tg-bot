import {nativeFieldRooms,migrateNativeRoomBanks,migrateNativeRandomGroups} from './nativeFieldRooms.js';
import pilot from '../../../template/nativeFieldPilot.js';
import landmarks from '../../../template/nativeInteriorLandmarks.js';
import {nativeInteriorMap} from './nativeInteriorMap.js';
import {ROOM_SIZE} from './navigation.js';
import {worldGeodata} from './l2jGeodata.js';
import {nativeGroundAllowed,nativeGroundAtStage,nativeDoorStates} from './nativeGround.js';
import {findNativePath} from './nativeNavigation.js';
import {nativeStaticSight} from './nativeVisibility.js';
import {createNativeJourney,advanceNativeJourney} from './nativeJourney.js';
import {rememberNativeTrail} from './nativeTrail.js';
import {nativeSpawnDistance,sampleNativeTerritory,nativeTerritorySource,nativeTerritoryGround} from './nativeSpawnTerritory.js';
import {sourcePopulationActive} from '../hunt/sourcePopulation.js';

// A residency budget, not a monster aggression/leash range. Public DTOs are capped separately.
export const NATIVE_FIELD_RADIUS=8192;
export const nativeFieldSupported=id=>Object.hasOwn(pilot.fields,id);
/** A documented source gap is never a permission to move or replace that spawn. */
export const nativeSourceGap=(zone,spawn)=>pilot.fields[zone]?.sourceGaps?.find(g=>g.npcId===spawn.id&&(g.kind==='point'?spawn.coordinateSource==='point'&&['x','y','z'].every(k=>g.source[k]===spawn[k]):spawn.coordinateSource!=='point'&&g.sourceGroup===spawn.sourceGroup&&g.sourceFile===(spawn.sourceFile||spawn.file)))||null;
const sourceSpawns=Object.fromEntries(Object.keys(pilot.fields).map(id=>[id,nativeFieldRooms(id).flatMap(r=>r.spawns||[])]));
const allSourceSpawns=Object.values(sourceSpawns).flat();
export const nativeFieldNear=(point,id)=>Boolean(point&&(id?sourceSpawns[id]||[]:allSourceSpawns).some(s=>nativeSpawnDistance(point,s)<=NATIVE_FIELD_RADIUS));
export function nativeFieldZone(point,preferred=null){
 if(preferred)return nativeFieldNear(point,preferred)&&nativeFieldEntryVisible(point,preferred)?preferred:null;
 if(!point)return null;
 let zone=null,distance=NATIVE_FIELD_RADIUS;
 for(const [id,spawns] of Object.entries(sourceSpawns)){
  if(!nativeFieldEntryVisible(point,id))continue;
  for(const spawn of spawns){const next=nativeSpawnDistance(point,spawn);if(next<=distance){zone=id;distance=next;}}
 }
 return zone;
}
/** Fixed-spawn sight or standing on an actual territory layer attaches a cave bank.
 * Residency itself does not depend on sight: walking behind a wall must not
 * unload the cave or recreate its monsters. Limit expensive sight probes.
 */
export function nativeFieldEntryVisible(point,id){
 if(!pilot.fields[id]?.interior)return true;
 if(Object.values(landmarks.zones[id]||{}).some(m=>Math.hypot(m.point.x-point.x,m.point.y-point.y,m.point.z-point.z)<=NATIVE_FIELD_RADIUS&&nativeStaticSight(point,m.point,{allowed:nativeGroundAllowed})))return true;
 const height=s=>s.coordinateSource==='point'?s.z:Math.trunc((s.minZ+s.maxZ)/2);
 return (sourceSpawns[id]||[]).filter(s=>nativeSpawnDistance(point,s)<=NATIVE_FIELD_RADIUS).sort((a,b)=>Math.hypot(nativeSpawnDistance(point,a),height(a)-point.z)-Math.hypot(nativeSpawnDistance(point,b),height(b)-point.z)).slice(0,48).some(s=>{
  if(s.coordinateSource==='point')return nativeStaticSight(point,s,{allowed:nativeGroundAllowed});
  // Polygon centroids partition legacy banks; they are never sight targets.
  // Standing on the original territory's actual selected layer is sufficient.
  return nativeTerritoryGround(nativeTerritorySource(id,s),point);
 });
}
export const nativeFieldInterior=id=>Boolean(pilot.fields[id]?.interior);
export const nativeInteriorAt=point=>Object.keys(pilot.fields).find(id=>nativeFieldInterior(id)&&nativeFieldNear(point,id)&&nativeFieldEntryVisible(point,id))||null;
export const nativeFieldCity=id=>pilot.fields[id]?.city||null;
export const nativeFieldIsland=id=>pilot.fields[id]?.island||null;
const worldAxis=value=>{const n=value*ROOM_SIZE,integer=Math.round(n);return Math.abs(n-integer)<1e-8?integer:n;};
export const nativeActorPoint=actor=>actor?.native&&({x:worldAxis(actor.x),y:worldAxis(actor.y),z:actor.native.z});
export const nativeFieldPoint=session=>session.game.world?.mode==='location'?nativeActorPoint(session.game.hunt?.field):null;
export const nativeFieldBuckets=field=>field?[field,...Object.values(field.rooms||{})]:[];
export function nativeFieldActors(hunt){
 const f=hunt?.field;if(!f?.native)return [];
 return nativeFieldBuckets(f).flatMap(b=>b.mobs||[]).filter(m=>m.currentHp>0&&m.native&&Math.hypot(m.x-f.x,m.y-f.y)*ROOM_SIZE<=NATIVE_FIELD_RADIUS);
}
export function placeNativeActor(actor,source){
 if(!source||!['x','y','z'].every(k=>Number.isFinite(source[k])))return false;
 const point=worldGeodata.point(source);
 // Preserve original coordinates. An absent layer still cannot prove placement.
 // Spawn.java corrects grounded, non-water monsters only when |geoZ-sourceZ| < 300.
 // The 40-unit movement step limit is a different rule.
 if(!point?.nswe||!nativeGroundAllowed(source)||!nativeGroundAllowed(point))return false;
 const z=Math.abs(point.z-source.z)<pilot.groundSpawnHeight.maxCorrectionExclusive?point.z:source.z;
 Object.assign(actor,{x:source.x/ROOM_SIZE,y:source.y/ROOM_SIZE,native:{z},path:[]});
 return true;
}
export function placeNativeSpawn(actor,random=Math.random){
 if(!actor.sourcePosition&&actor.sourceTerritory){
  const position=sampleNativeTerritory(actor.sourceTerritory,{random});if(!position)return false;
  actor.sourcePosition=position;actor.sourcePlacement='territory';
 }
 return placeNativeActor(actor,actor.sourcePosition);
}
export function activateNativeField(hunt,point,now){
 const f=hunt?.field;if(!nativeFieldSupported(hunt?.zone)||!f)return false;
 if(!f.native){
  f.native={version:1,z:point.z,loaded:{},missing:{},randomGroups:{}};
  migrateNativeRoomBanks(f,hunt.zone);
  migrateNativeRandomGroups(f,hunt.zone);
  // Existing room banks already rolled their entire source group. Preserve even
  // mixed species left by respawns; migration must never refill lost rolls.
  const existing=nativeFieldBuckets(f).flatMap(b=>b.mobs||[]);
  for(const room of nativeFieldRooms(hunt.zone)){
   let slot=0;
   for(const entry of room.spawns||[]){
    if(entry.randomGroup&&(room.id===f.room||Object.hasOwn(f.rooms||{},room.id)||existing.some(m=>m.sourceRoom===room.id&&m.sourceRandomGroup===entry.randomGroup)||(f.respawns||[]).some(r=>r.room===room.id&&r.sourceSlot>=slot&&r.sourceSlot<slot+entry.count)))f.native.randomGroups[room.id+':'+entry.randomGroup]=-1;
    slot+=entry.count;
   }
  }
  for(const bank of nativeFieldBuckets(f))bank.mobs=(bank.mobs||[]).filter(m=>{
   const key=m.sourceRoom+':'+m.sourceSlot;
   if(!placeNativeSpawn(m)){f.native.missing[key]='source_ground_unavailable';return false;}
   m.ai=null;f.native.loaded[key]=true;return true;
  });
 }
 Object.assign(f,{x:point.x/ROOM_SIZE,y:point.y/ROOM_SIZE,path:[],walls:[],moveAt:now,seenAt:now});
 f.native.z=point.z;f.native.nativeIsland=pilot.fields[hunt.zone]?.island||null;delete f.native.journey;delete f.native.nativeTrail;delete f.native.floorResume;
 const nearest=nativeFieldRooms(hunt.zone).flatMap(r=>(r.spawns||[]).map(s=>({room:r.id,distance:nativeSpawnDistance(point,s)}))).sort((a,b)=>a.distance-b.distance)[0];
 if(nearest&&nearest.room!==f.room){
  f.rooms[f.room]={mobs:f.mobs};f.mobs=f.rooms[nearest.room]?.mobs||[];delete f.rooms[nearest.room];f.room=nearest.room;
 }
 return true;
}
/** Reuse original room/slot ownership for rewards and respawns; visual rooms own no copies. */
export function syncNativePopulation(hunt,layout,now,populate,random=Math.random){
 const f=hunt?.field;if(!f?.native)return false;
 const pending=new Set((f.respawns||[]).map(r=>r.room+':'+r.sourceSlot));
 const upgradePlacement=f.native.placementPolicyVersion!==pilot.groundSpawnHeight.version;
 for(const room of layout.rooms){
  let slot=0;
  for(const [entryIndex,source] of (room.spawns||[]).entries())for(let i=0;i<source.count;i++,slot++){
   // Inactive source slots are neither loaded nor missing. A later world phase
   // may activate the same stable room/slot without retrying invalid ground.
   if(!sourcePopulationActive(source,hunt.zone==='hellbound'?f.populationStage:null))continue;
   const key=room.id+':'+slot;
   if(upgradePlacement&&f.native.missing[key]&&source.coordinateSource==='point'){
    const ground=worldGeodata.point(source);
    if(ground&&Math.abs(ground.z-source.z)>=pilot.groundSpawnHeight.maxCorrectionExclusive&&placeNativeActor({},source))delete f.native.missing[key];
   }
   if(f.native.loaded[key]||f.native.missing[key]||pending.has(key))continue;
   if(nativeSpawnDistance({x:f.x*ROOM_SIZE,y:f.y*ROOM_SIZE},source)>NATIVE_FIELD_RADIUS)continue;
   if(source.randomGroup){
    const groups=f.native.randomGroups||={},key=room.id+':'+source.randomGroup;
    if(!Object.hasOwn(groups,key)){const entries=room.spawns.flatMap((s,index)=>s.randomGroup===source.randomGroup?[index]:[]);groups[key]=entries[Math.min(entries.length-1,Math.floor(random()*entries.length))];}
    if(groups[key]!==entryIndex)continue;
   }
   const bank=room.id===f.room?f:(f.rooms[room.id]||={mobs:[]});
   f.seq=(f.seq||0)+1;
   const [mob]=populate(room,slot,`${now}:native:${f.seq}`);
   if(!mob?.native){f.native.missing[key]='source_ground_unavailable';continue;}
   f.native.loaded[key]=true;bank.mobs.push(mob);
  }
 }
 if(pilot.fields[hunt.zone]?.floors){
  const distance=m=>Math.hypot((m.x-f.x)*ROOM_SIZE,(m.y-f.y)*ROOM_SIZE,m.native.z-f.native.z);
  const floorActor=nativeVisibleActors(hunt).filter(m=>!m.sourceTerritory).sort((a,b)=>distance(a)-distance(b))[0];
  const territoryRoom=floorActor?null:nativeTerritoryFloorRoom(hunt.zone,layout.rooms,nativeActorPoint(f));
  const floor=floorActor?.sourceFloor||territoryRoom?.sourceFloor,room=floorActor?.sourceRoom||territoryRoom?.id;
  if(floor){
   f.native.sourceFloor=floor;
   if(room!==f.room){
    f.rooms[f.room]={mobs:f.mobs};f.mobs=f.rooms[room]?.mobs||[];delete f.rooms[room];f.room=room;
    if(!f.visited.includes(f.room))f.visited.push(f.room);
   }
  }
 }
 f.native.placementPolicyVersion=pilot.groundSpawnHeight.version;
 const visible=new Set(nativeFieldActors(hunt).map(m=>m.instanceId));
 for(const bank of nativeFieldBuckets(f))for(const m of bank.mobs||[])if(!visible.has(m.instanceId)){
  m.aggro=false;m.path=[];delete m.native?.journey;m.lastMoveAt=now;m.nextAttackAt=now+m.attackMs;
 }
 if(!visible.has(f.target)||pilot.fields[hunt.zone]?.interior&&!nativeCombatLine(f,nativeFieldActors(hunt).find(m=>m.instanceId===f.target)))f.target=nativeVisibleActors(hunt)[0]?.instanceId||null;
 return true;
}
/** Polygon-only floors are identified by the original area and actual layer.
 * Slot centroids and the current randomized actor positions are not witnesses. */
export function nativeTerritoryFloorRoom(zone,rooms,point){
 const seen=new Set(),matches=new Map();
 for(const room of rooms)for(const slot of room.spawns||[]){
  if(slot.coordinateSource==='point'||!room.sourceFloor)continue;
  const key=room.sourceFloor+':'+(slot.file||slot.sourceFile)+':'+slot.sourceGroup;if(seen.has(key))continue;seen.add(key);
  if(nativeTerritoryGround(nativeTerritorySource(zone,slot),point))matches.set(room.sourceFloor,room);
 }
 for(const [floor,landmark] of Object.entries(landmarks.zones[zone]||{})){
  const room=rooms.find(r=>r.sourceFloor===Number(floor));if(!room)continue;
  const ground=worldGeodata.point(landmark.point);
  if(ground&&Math.hypot(ground.x-point.x,ground.y-point.y,ground.z-point.z)<=NATIVE_FIELD_RADIUS&&nativeStaticSight(point,ground,{allowed:nativeGroundAllowed}))matches.set(Number(floor),room);
 }
 return matches.size===1?matches.values().next().value:null;
}
export function moveNativeActor(actor,target,now,speed){
 const from=nativeActorPoint(actor);if(!from||!target||![target.x,target.y].every(Number.isFinite))return {ok:false,reason:'invalid_move'};
 // Combat targets are server-owned actors. Plain walking commands carry only
 // XY, so a client cannot choose a floor by supplying a height.
 const goal={x:worldAxis(target.x),y:worldAxis(target.y),z:Number.isFinite(target.native?.z)?target.native.z:from.z};
 if(Math.hypot(goal.x-from.x,goal.y-from.y)>8192)return {ok:false,reason:'path_blocked'};
 const allowed=nativeGroundAtStage(actor.native?.hellboundStage??target.native?.hellboundStage);
 const plan=findNativePath(from,goal,{allowed,maxNodes:6000,stride:2,reversible:true,heuristicWeight:2});
 if(!plan.ok)return plan;
 const trip=createNativeJourney(plan.start,plan.path,{now,speed,allowed});
 if(!trip)return {ok:false,reason:'path_blocked'};
 trip.native.historyStart={...plan.start};
 actor.native.journey=trip;actor.moveAt=now;actor.path=trip.native.path.slice(0,16).map(p=>({x:p.x/ROOM_SIZE,y:p.y/ROOM_SIZE,z:p.z}));
 return {ok:true};
}
export function advanceNativeActor(actor,now,speed){
 const trip=actor.native?.journey;if(!trip){actor.path=[];actor.moveAt=now;return;}
 const done=advanceNativeJourney(trip,now,speed,{allowed:nativeGroundAtStage(actor.native?.hellboundStage)}),p=trip.native.point;
 actor.x=p.x/ROOM_SIZE;actor.y=p.y/ROOM_SIZE;actor.native.z=p.z;actor.moveAt=now;
 actor.path=trip.native.blocked?[]:trip.native.path.slice(trip.native.index,trip.native.index+16).map(p=>({x:p.x/ROOM_SIZE,y:p.y/ROOM_SIZE,z:p.z}));
 if(done&&trip.native.floorTarget)actor.native.sourceFloor=trip.native.floorTarget;
 if(done||trip.native.blocked)stopNativeActor(actor);
}
export function stopNativeActor(actor){
 const trip=actor.native?.journey;if(actor.native?.version===1&&trip?.native?.floorTarget&&trip.native.remaining>0&&!trip.native.blocked)actor.native.floorResume=structuredClone(trip);
 if(actor.native?.version===1)rememberNativeTrail(actor.native,actor.native.journey);
 if(actor.native)delete actor.native.journey;actor.path=[];
}
/** Original static H5 sight plus conservative door/water/holding vetoes. */
export function nativeCombatLine(a,b){
 const from=nativeActorPoint(a),to=nativeActorPoint(b);
 return Boolean(from&&to&&nativeStaticSight(from,to,{allowed:nativeGroundAtStage(a.native?.hellboundStage??b.native?.hellboundStage)}));
}
export const nativeMobMovement=mob=>pilot.actors[mob.mobId]||null;
/** The public target list has a fixed sight budget, including Canvas fallback. */
export function nativeVisibleActors(hunt){
 const f=hunt?.field;
 const distance=m=>Math.hypot((m.x-f.x)*ROOM_SIZE,(m.y-f.y)*ROOM_SIZE,pilot.fields[hunt?.zone]?.floors?m.native.z-f.native.z:0);
 const nearest=nativeFieldActors(hunt).sort((a,b)=>Number(b.instanceId===f.target)-Number(a.instanceId===f.target)||distance(a)-distance(b)).slice(0,48);
 return pilot.fields[hunt?.zone]?.interior?nearest.filter(m=>nativeCombatLine(f,m)):nearest;
}
export function nativeFieldDto(session){
 const f=session.game.hunt?.field,point=nativeFieldPoint(session);if(!point)return null;
 return {zone:session.game.hunt.zone,point,target:f.target,ground:nativeInteriorMap(session.game.hunt.zone,point,f.native.sourceFloor),...(pilot.fields[session.game.hunt.zone]?.peacefulViewSize&&f.native.sourceFloor!==1?{viewSize:pilot.fields[session.game.hunt.zone].peacefulViewSize}:{}),...(session.game.hunt.zone==='hellbound'?{doors:nativeDoorStates(f.populationStage)}:{}),
  actors:nativeVisibleActors(session.game.hunt).map(m=>({
   ...nativeActorPoint(m),id:m.mobId,instanceId:m.instanceId,name:m.name,level:m.level,hp:m.hp,currentHp:m.currentHp,aggressive:Boolean(m.aggressive),social:Boolean(m.clanHelpRange&&m.socialClans?.length),aggro:Boolean(m.aggro)
  }))};
}
