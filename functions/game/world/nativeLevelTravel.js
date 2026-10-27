import data from '../../../template/nativeLevelRoutes.js';
import world from '../../../template/nativeRoutes.js';
import approaches from '../../../template/nativeInteriorRoutes.js';
import {nativeTrailBack,rememberNativeTrail} from './nativeTrail.js';
import {nativeActorPoint} from './nativeFieldSpace.js';
import {nativeSegment,findNativePath} from './nativeNavigation.js';
import {nativeGroundFor,nativeGroundBlock,nativeGroundDoorIds} from './nativeGround.js';
import pagan from '../../../template/paganAccess.js';
import paganKeys from '../../../template/paganKeys.js';
import {nativeChurchOptions} from './nativeChurchTravel.js';
import {createNativeJourney,pruneNativeLoops,advanceNativeJourney} from './nativeJourney.js';
import {nativePortOptions,nativeFloorPort} from './nativeFloorTransports.js';
import {worldGeodata} from './l2jGeodata.js';
const model=id=>data.geodataCommit===world.geodataCommit&&data.barriersSha256===world.barriersSha256?data.zones[id]:null;
export const nativeLevelArrival=(id,floor)=>model(id)?.levels?.[floor]?.to||null;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const paganDoors=new Set([...pagan.doors.flatMap(d=>d.doorIds.map(String)),...Object.keys(paganKeys.doors)]);
/** A distant closed door stops the walk at its first blocked cell. It never
 * requires all timed doors on a long route to remain open at the same time. */
function paganWalkPrefix(from,path,allowed){
 const geometry=p=>!nativeGroundBlock(p,{openDoors:paganDoors}),prefix=[];let previous=from;
 for(const next of path){
  const cells=nativeSegment(previous,next,{allowed:geometry,reversible:true});if(!cells)return null;
  const blocked=cells.findIndex(p=>!allowed(p));
  if(blocked>=0){
   const count=Math.min(blocked,480-prefix.length),point=count===blocked?cells[blocked]:null;
   return {path:[...prefix,...cells.slice(0,count)],partial:true,blockedPoint:point,closedDoors:point?nativeGroundDoorIds(point):[]};
  }
  prefix.push(next);previous=next;
 }
 return {path:prefix,partial:false};
}
export function nativeLevelOptions(hunt){
 const source=model(hunt?.zone),point=nativeActorPoint(hunt?.field);if(!point)return [];
 const port=nativeFloorPort(hunt),portals=nativePortOptions(hunt),choices=[...portals];
 for(const [floor,l] of Object.entries(source?.levels||{}))if(!choices.some(p=>p.floor===Number(floor))&&source.levels[hunt.field.native.sourceFloor])choices.push({floor:Number(floor),title:l.title,enabled:distance(point,l.to)>16});
 for(const route of nativeChurchOptions(hunt)){const at=choices.findIndex(p=>p.floor===route.floor&&!p.routeId);if(at>=0)choices[at]=route;else choices.push(route);}
 return choices.sort((a,b)=>a.floor-b.floor);
}
/** Rejoin only verified vertices. An inaccessible join never grants a floor switch. */
export function nativeLevelTravel(session,floor,now,speed){
 const hunt=session.game.hunt,source=model(hunt?.zone),from=nativeActorPoint(hunt?.field);
 if(!source||!from||!Number.isInteger(floor)||!source.levels[floor])return {ok:false,reason:'invalid_floor'};
 const target=source.levels[floor];if(distance(from,target.to)<=16)return {ok:false,reason:'invalid_floor'};
 const gate=hunt.field.native.gatedWalk;
 if(gate?.floor===floor&&gate.blockedPoint&&distance(from,gate.point)<=16&&!nativeGroundFor(session,now)(gate.blockedPoint))return {ok:false,reason:'door_closed'};
 const saved=hunt.field.native.floorResume;
 if(saved?.native?.floorTarget===floor&&distance(saved.native.point,from)<1e-7&&distance(saved.native.path?.at(-1)||{},target.to)<1e-7){
  const trip=structuredClone(saved);advanceNativeJourney(trip,now,0,{allowed:nativeGroundFor(session,now)});
  if(!trip.native.blocked){trip.until=now+Math.ceil(trip.native.remaining/Math.max(1,speed)*1000);delete hunt.field.native.floorResume;return {ok:true,trip};}
 }
 const allowed=nativeGroundFor(session,now);
 function rejoin(at){
 const joins=new Map();
 function candidate(point,suffix){
  const near=distance(at,point);if(near>8192)return;
  // Shared tower stair prefixes otherwise look like a detour via the root.
  // Remove only exact XYZ loops before scoring, preserving stacked landings.
  suffix=pruneNativeLoops(point,suffix);let length=0,previous=point;
  for(const p of suffix){length+=Math.hypot(p.x-previous.x,p.y-previous.y);previous=p;}
  const key=`${point.x},${point.y},${point.z}`,score=near+length;
  if(!joins.has(key)||score<joins.get(key).score)joins.set(key,{point,suffix,near,score});
 }
 for(const route of Object.values(source.levels)){
  const vertices=[source.root,...route.path];
  for(let i=0;i<vertices.length;i++){
   const point=vertices[i];
   const suffix=route===target?vertices.slice(i+1):[...vertices.slice(0,i).reverse(),...target.path];
   candidate(point,suffix);
  }
 }
 const approach=approaches.geodataCommit===data.geodataCommit&&approaches.barriersSha256===data.barriersSha256&&approaches.routes[hunt.zone];
 if(approach&&distance(approach.to,source.root)<1e-7){
  const vertices=[approach.from,...approach.path];
  for(let i=0;i<vertices.length;i++){
   candidate(vertices[i],[...vertices.slice(i+1),...target.path]);
  }
 }
 // Rejoin the local stair network before optimizing its remaining route.
 // A stacked upper landing can look close in XY while its join is blocked.
 const candidates=[...joins.values()].sort((a,b)=>a.near-b.near||a.score-b.score);
 let plan;
 for(const c of candidates.slice(0,64))if(nativeSegment(at,c.point,{allowed,reversible:true})){plan={start:at,path:[c.point,...c.suffix]};break;}
 if(!plan)for(const c of candidates.slice(0,6)){
  const join=findNativePath(at,c.point,{allowed,stride:2,maxNodes:1000,margin:128,heuristicWeight:2,reversible:true});
  if(join.ok){plan={start:join.start,path:[...join.path,...c.suffix]};break;}
 }
 return plan;
 }
 let plan=rejoin(from);
 if(!plan){
  const history={nativePosition:from,nativeIsland:hunt.field.native.nativeIsland||null,nativeTrail:hunt.field.native.nativeTrail};
  rememberNativeTrail(history,hunt.field.native.journey);const trail=nativeTrailBack(history),back=trail&&rejoin(trail.root);
  if(back)plan={start:from,path:[...trail.path,...back.path]};
 }
 if(!plan)return {ok:false,reason:'path_blocked'};
 // Teleports retain original source Z. Walking uses the selected ground layer,
 // as findNativePath does, so its saved breadcrumbs contain actual ground.
 const start=worldGeodata.point(plan.start),path=plan.path.map(p=>worldGeodata.point(p));
 if(!start||path.some(p=>!p))return {ok:false,reason:'path_blocked'};
 const route=pruneNativeLoops(start,path),prefix=hunt.zone==='pagan-temple'?paganWalkPrefix(start,route,allowed):{path:route,partial:false};
 if(!prefix?.path.length||prefix.partial&&prefix.path.every(p=>distance(p,start)<1e-7))return {ok:false,reason:hunt.zone==='pagan-temple'?'door_closed':'path_blocked'};
 const trip=createNativeJourney(start,prefix.path,{now,speed,allowed});if(!trip)return {ok:false,reason:'path_blocked'};
 trip.native.historyStart={...start};if(!prefix.partial)trip.native.floorTarget=floor;else Object.assign(trip.native,{floorGoal:floor,blockedPoint:prefix.blockedPoint,closedDoors:prefix.closedDoors});
 return {ok:true,trip};
}
