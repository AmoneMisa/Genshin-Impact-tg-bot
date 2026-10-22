import pilot from '../../../template/nativeFieldPilot.js';
import {LOCATION_LEVELS} from '../../../template/locationLevels.js';
import {ROOM_SIZE} from './navigation.js';
import {worldGeodata} from './l2jGeodata.js';
import {nativeGroundAllowed} from './nativeGround.js';
import {findNativePath,nativeSegment} from './nativeNavigation.js';
import {createNativeJourney,advanceNativeJourney} from './nativeJourney.js';
import {rememberNativeTrail} from './nativeTrail.js';

// A residency budget, not a monster aggression/leash range. Public DTOs are capped separately.
export const NATIVE_FIELD_RADIUS=8192;
export const nativeFieldSupported=id=>id===pilot.zone;
const pilotSpawns=LOCATION_LEVELS[pilot.zone].floors[0].rooms.flatMap(r=>r.spawns||[]).filter(s=>s.coordinateSource==='point');
export const nativeFieldNear=point=>Boolean(point&&pilotSpawns.some(s=>Math.hypot(s.x-point.x,s.y-point.y)<=NATIVE_FIELD_RADIUS));
export const nativeFieldZone=()=>pilot.zone;
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
 // Preserve the source XY; an unavailable layer must never become a guessed spawn.
 // Spawn.java corrects grounded, non-water monsters only when |geoZ-sourceZ| < 300.
 // The 40-unit movement step limit is a different rule.
 if(!point?.nswe||Math.abs(point.z-source.z)>=pilot.groundSpawnHeight.maxCorrectionExclusive||!nativeGroundAllowed(source)||!nativeGroundAllowed(point))return false;
 Object.assign(actor,{x:source.x/ROOM_SIZE,y:source.y/ROOM_SIZE,native:{z:point.z},path:[]});
 return true;
}
export function activateNativeField(hunt,point,now){
 const f=hunt?.field;if(!nativeFieldSupported(hunt?.zone)||!f)return false;
 if(!f.native){
  f.native={version:1,z:point.z,loaded:{},missing:{}};
  for(const bank of nativeFieldBuckets(f))bank.mobs=(bank.mobs||[]).filter(m=>{
   const key=m.sourceRoom+':'+m.sourceSlot;
   if(!placeNativeActor(m,m.sourcePosition)){f.native.missing[key]='source_ground_unavailable';return false;}
   m.ai=null;f.native.loaded[key]=true;return true;
  });
 }
 Object.assign(f,{x:point.x/ROOM_SIZE,y:point.y/ROOM_SIZE,path:[],walls:[],moveAt:now,seenAt:now});
 f.native.z=point.z;delete f.native.journey;delete f.native.nativeTrail;
 const nearest=LOCATION_LEVELS[hunt.zone].floors[0].rooms.flatMap(r=>(r.spawns||[]).filter(s=>s.coordinateSource==='point').map(s=>({room:r.id,distance:Math.hypot(s.x-point.x,s.y-point.y)}))).sort((a,b)=>a.distance-b.distance)[0];
 if(nearest&&nearest.room!==f.room){
  f.rooms[f.room]={mobs:f.mobs};f.mobs=f.rooms[nearest.room]?.mobs||[];delete f.rooms[nearest.room];f.room=nearest.room;
 }
 return true;
}
/** Reuse original room/slot ownership for rewards and respawns; visual rooms own no copies. */
export function syncNativePopulation(hunt,layout,now,populate){
 const f=hunt?.field;if(!f?.native)return false;
 const pending=new Set((f.respawns||[]).map(r=>r.room+':'+r.sourceSlot));
 for(const room of layout.rooms){
  let slot=0;
  for(const source of room.spawns||[])for(let i=0;i<source.count;i++,slot++){
   const key=room.id+':'+slot;
   if(f.native.loaded[key]||f.native.missing[key]||pending.has(key))continue;
   if(source.coordinateSource!=='point'){f.native.missing[key]='source_position_unavailable';continue;}
   if(Math.hypot(source.x-f.x*ROOM_SIZE,source.y-f.y*ROOM_SIZE)>NATIVE_FIELD_RADIUS)continue;
   const bank=room.id===f.room?f:(f.rooms[room.id]||={mobs:[]});
   f.seq=(f.seq||0)+1;
   const [mob]=populate(room,slot,`${now}:native:${f.seq}`);
   if(!mob||!placeNativeActor(mob,source)){f.native.missing[key]='source_ground_unavailable';continue;}
   f.native.loaded[key]=true;bank.mobs.push(mob);
  }
 }
 const visible=new Set(nativeFieldActors(hunt).map(m=>m.instanceId));
 for(const bank of nativeFieldBuckets(f))for(const m of bank.mobs||[])if(!visible.has(m.instanceId)){
  m.aggro=false;m.path=[];delete m.native?.journey;m.lastMoveAt=now;m.nextAttackAt=now+m.attackMs;
 }
 if(!visible.has(f.target))f.target=nativeFieldActors(hunt).sort((a,b)=>Math.hypot(a.x-f.x,a.y-f.y)-Math.hypot(b.x-f.x,b.y-f.y))[0]?.instanceId||null;
 return true;
}
export function moveNativeActor(actor,target,now,speed){
 const from=nativeActorPoint(actor);if(!from||!target||![target.x,target.y].every(Number.isFinite))return {ok:false,reason:'invalid_move'};
 const goal={x:target.x*ROOM_SIZE,y:target.y*ROOM_SIZE,z:from.z};
 if(Math.hypot(goal.x-from.x,goal.y-from.y)>8192)return {ok:false,reason:'path_blocked'};
 const plan=findNativePath(from,goal,{allowed:nativeGroundAllowed,maxNodes:6000,stride:2,reversible:true});
 if(!plan.ok)return plan;
 const trip=createNativeJourney(plan.start,plan.path,{now,speed});
 if(!trip)return {ok:false,reason:'path_blocked'};
 trip.native.historyStart={...plan.start};
 actor.native.journey=trip;actor.moveAt=now;actor.path=trip.native.path.slice(0,16).map(p=>({x:p.x/ROOM_SIZE,y:p.y/ROOM_SIZE,z:p.z}));
 return {ok:true};
}
export function advanceNativeActor(actor,now,speed){
 const trip=actor.native?.journey;if(!trip){actor.path=[];actor.moveAt=now;return;}
 const done=advanceNativeJourney(trip,now,speed),p=trip.native.point;
 actor.x=p.x/ROOM_SIZE;actor.y=p.y/ROOM_SIZE;actor.native.z=p.z;actor.moveAt=now;
 actor.path=trip.native.blocked?[]:trip.native.path.slice(trip.native.index,trip.native.index+16).map(p=>({x:p.x/ROOM_SIZE,y:p.y/ROOM_SIZE,z:p.z}));
 if(done||trip.native.blocked)stopNativeActor(actor);
}
export function stopNativeActor(actor){
 if(actor.native?.version===1)rememberNativeTrail(actor.native,actor.native.journey);
 if(actor.native)delete actor.native.journey;actor.path=[];
}
/** Conservative native obstruction check; no ray may pass an unverified ground layer. */
export function nativeCombatLine(a,b){
 const from=nativeActorPoint(a),to=nativeActorPoint(b);
 return Boolean(from&&to&&nativeSegment(from,to,{allowed:nativeGroundAllowed,reversible:true,maxCells:512}));
}
export const nativeMobMovement=mob=>pilot.actors[mob.mobId]||null;
export function nativeFieldDto(session){
 const f=session.game.hunt?.field,point=nativeFieldPoint(session);if(!point)return null;
 return {zone:session.game.hunt.zone,point,target:f.target,
  actors:nativeFieldActors(session.game.hunt).sort((a,b)=>Number(b.instanceId===f.target)-Number(a.instanceId===f.target)||Math.hypot(a.x-f.x,a.y-f.y)-Math.hypot(b.x-f.x,b.y-f.y)).slice(0,48).map(m=>({
   ...nativeActorPoint(m),id:m.mobId,instanceId:m.instanceId,name:m.name,level:m.level,hp:m.hp,currentHp:m.currentHp,aggressive:Boolean(m.aggressive),social:Boolean(m.clanHelpRange&&m.socialClans?.length),aggro:Boolean(m.aggro)
  }))};
}
