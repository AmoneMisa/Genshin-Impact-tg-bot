import nativeWorld from '../../../template/nativeWorld.js';
import {CITY_NPCS} from '../../../template/worldMap.js';
import {findNativePath} from './nativeNavigation.js';
import {nativeGroundAllowed} from './nativeGround.js';
import {worldGeodata} from './l2jGeodata.js';
import {createNativeJourney,advanceNativeJourney} from './nativeJourney.js';

const size=city=>city.size||14000;
const world=(city,p,z)=>({x:city.x+(p.x-.5)*size(city),y:city.y+(p.y-.5)*size(city),z});
const local=(city,p)=>({x:.5+(p.x-city.x)/size(city),y:.5+(p.y-city.y)/size(city),z:p.z});
/** Replace only the old unspecified centre spawn; never relocate a saved physical position. */
export function ensureCityOrigin(actor,city){
 if(!city||actor.mode!=='city'||Number.isFinite(actor.z)||actor.x!==.5||actor.y!==.5||actor.path?.length||actor.pending)return;
 const gate=nativeWorld.towns[city.id];
 const score=p=>gate?Math.hypot(p.x-gate.x,p.y-gate.y,p.z-gate.z):0;
 for(const source of [...(city.arrivals||[])].sort((a,b)=>score(a)-score(b))){
  const point=worldGeodata.point(source);
  if(point?.nswe&&nativeGroundAllowed(point)){Object.assign(actor,local(city,point));return;}
 }
}
function sourceHeight(city){
 return city.z??nativeWorld.towns[city.id]?.z??CITY_NPCS.find(n=>n.city===city.id&&Number.isFinite(n.z))?.z;
}
/** Map tiles, NPCs and collisions share original world coordinates; no artwork-derived walls. */
export function findCityPath(actor,city,target){
 if(![target?.x,target?.y].every(Number.isFinite)||target.x<.02||target.x>.98||target.y<.02||target.y>.98)return null;
 const height=Number.isFinite(actor.z)?actor.z:sourceHeight(city);
 if(!Number.isFinite(height))return null;
 const from=world(city,actor,height),to=world(city,target,Number.isFinite(target.z)?target.z:height);
 let plan=findNativePath(from,to,{allowed:nativeGroundAllowed,stride:2,maxNodes:4000,margin:128,reversible:true,heuristicWeight:2});
 if(!plan.ok)plan=findNativePath(from,to,{allowed:nativeGroundAllowed,stride:1,maxNodes:4000,margin:128,reversible:true});
 if(!plan.ok)return null;
 if(!plan.path.length){delete actor.cityWalk;return [];}
 const trip=createNativeJourney(plan.start,plan.path,{now:actor.moveAt||0,speed:1});
 if(!trip)return null;
 actor.cityWalk={city:city.id,trip};return plan.path.map(p=>local(city,p));
}
export function advanceCityPath(actor,city,now,speed){
 if(!actor.path?.length){delete actor.cityWalk;actor.moveAt=now;return;}
 // Saved legacy paths are re-planned before any distance is consumed.
 let saved=actor.cityWalk;
 if(saved){
  const at=local(city,saved.trip.native.point),next=saved.trip.native.path[saved.trip.native.index],expected=next&&local(city,next),actual=actor.path[0];
  if(Math.hypot(actor.x-at.x,actor.y-at.y)>1e-9||!expected||Math.hypot(actual.x-expected.x,actual.y-expected.y)>1e-9){delete actor.cityWalk;saved=null;}
 }
 if(!saved||saved.city!==city.id){
  const path=findCityPath(actor,city,actor.path.at(-1));actor.path=path||[];
  if(!actor.cityWalk){actor.moveAt=now;return;}
 }
 const trip=actor.cityWalk.trip;
 trip.native.moveAt=actor.moveAt??now;
 advanceNativeJourney(trip,now,speed);actor.moveAt=now;
 const p=local(city,trip.native.point);Object.assign(actor,p);
 actor.path=trip.native.blocked?[]:trip.native.path.slice(trip.native.index).map(p=>local(city,p));
 if(!actor.path.length)delete actor.cityWalk;
}
export function cityNavigationStatus(city){
 const z=sourceHeight(city);
 return Number.isFinite(z)&&Boolean(worldGeodata.point({...city,z}));
}
