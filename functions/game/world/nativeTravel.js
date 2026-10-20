import routes from '../../../template/nativeRoutes.js';
import nativeWorld from '../../../template/nativeWorld.js';
import {CITIES} from '../../../template/worldMap.js';
import {findNativePath} from './nativeNavigation.js';
import {nativeGroundAllowed} from './nativeGround.js';
import {createNativeJourney} from './nativeJourney.js';
import {outdoorPoint} from './holdingEntry.js';
import {worldGeodata,geoRegionId} from './l2jGeodata.js';

export const nativeRoute=id=>routes.routes[id]?.available?routes.routes[id]:null;
/** Rejoin an already verified trail locally instead of searching a whole long valley again. */
function reconnectNativeTrail(from,to,city){
 const candidates=[];
 for(const route of Object.values(routes.routes)){
  if(!route.available||route.city!==(to?.city||city))continue;
  const vertices=[route.from,...route.path];
  for(let index=0;index<vertices.length;index++){
   const point=vertices[index],distance=Math.hypot(from.x-point.x,from.y-point.y);
   if(distance>8192)continue;
   const suffix=to===route?vertices.slice(index+1):[...vertices.slice(0,index).reverse(),...(to?.path||[])];
   let remaining=0,previous=point;for(const next of suffix){remaining+=Math.hypot(next.x-previous.x,next.y-previous.y);previous=next;}
   candidates.push({point,suffix,score:distance+remaining});
  }
 }
 candidates.sort((a,b)=>a.score-b.score);
 for(const {point,suffix} of candidates.slice(0,6)){
  const prefix=findNativePath(from,point,{allowed:nativeGroundAllowed,maxNodes:1000,stride:2,margin:128,reversible:true});
  if(prefix.ok)return {...prefix,path:[...prefix.path,...suffix]};
 }
 return null;
}
export function nativeExit(session){
 const w=session.game.world,f=session.game.hunt?.field,route=nativeRoute(w?.location);
 if(w?.mode!=='location'||session.game.hunt?.zone!==w.location||!route?.returnPath||!f)return null;
 return {room:'r0c0',floor:1,point:{x:.5,y:.95},near:f.room==='r0c0'&&(f.floor||1)===1&&Math.hypot(f.x-.5,f.y-.95)<=.08,city:route.city};
}

/** Original entry/gatekeeper anchors bind local artwork to the native coordinate space. */
export function nativeTravel(session,target,now,speed){
 const w=session.game.world,to=target?.location&&nativeRoute(target.location),from=w.mode==='location'&&nativeRoute(w.location);
 let start,path,arrivalCity=target?.city||null;
 if(target?.location===w.location&&w.mode==='location')return {ok:false,reason:'location_path_required'};
 if(w.mode==='city'&&to){
  if(w.city!==to.city)return {ok:false,reason:'location_path_required'};
  const point=outdoorPoint(session),town=nativeWorld.towns[w.city];
  if(!point||!town)return {ok:false,reason:'geodata_missing'};
  const prefix=findNativePath({...point,z:Number.isFinite(w.z)?w.z:town.z},to.from,{allowed:nativeGroundAllowed,maxNodes:3000,stride:2,reversible:true});
  if(!prefix.ok)return prefix;
  start=prefix.start;path=[...prefix.path,...to.path];
 }else if(w.mode==='location'&&from?.returnPath&&(to?.city===from.city||arrivalCity===from.city)){
  if(!nativeExit(session)?.near)return {ok:false,reason:'entrance_required'};
  start=from.to;path=[...from.returnPath,...(to?.path||[])];
 }else if(w.mode==='native'&&w.nativePosition){
  const endpoint=to?.to||nativeWorld.towns[arrivalCity];
  if(!endpoint)return {ok:false,reason:'location_path_required'};
  const plan=reconnectNativeTrail(w.nativePosition,to,arrivalCity)||findNativePath(w.nativePosition,endpoint,{allowed:nativeGroundAllowed,maxNodes:6000,reversible:true});
  if(!plan.ok)return plan;start=plan.start;path=plan.path;
 }else return {ok:false,reason:'location_path_required'};
 const trip=createNativeJourney(start,path,{now,speed,location:to?target.location:null,city:arrivalCity});
 return trip?{ok:true,trip}:{ok:false,reason:'path_blocked'};
}

export function nativeFreeWalk(session,point,now,speed){
 const w=session.game.world,from=w.walkHome?.native?.point||w.nativePosition;
 if(!['native','road'].includes(w.mode)||!from||w.mode==='road'&&!w.walkHome?.native)return {ok:false,reason:'no_field'};
 const x=Number(point?.x),y=Number(point?.y);
 if(![x,y].every(Number.isFinite)||Math.hypot(x-from.x,y-from.y)>8192)return {ok:false,reason:'path_blocked'};
 // The client never selects a height, layer, room, instance, or zone.
 const plan=findNativePath(from,{x,y,z:from.z},{allowed:nativeGroundAllowed,maxNodes:6000,reversible:true});
 if(!plan.ok)return plan;
 const trip=createNativeJourney(plan.start,plan.path,{now,speed});
 return trip?{ok:true,trip}:{ok:false,reason:'path_blocked'};
}

export function nativeWalkOptions(session){
 const w=session.game.world,exit=nativeExit(session);
 return Object.fromEntries(Object.entries(routes.routes).filter(([,r])=>r.available).map(([id,r])=>[id,{enabled:w.mode==='city'?w.city===r.city:w.mode==='location'?Boolean(exit&&exit.city===r.city&&id!==w.location):w.mode==='native',viaCity:w.mode==='location'?(CITIES.find(c=>c.id===r.city)?.name||r.city):null,exitRequired:w.mode==='location'&&!exit?.near}]));
}
export const nativeWalkCities=()=>Object.entries(nativeWorld.towns).filter(([,town])=>worldGeodata.manifest.regions[geoRegionId(town.x,town.y)]).map(([id])=>id);

export const nativeWorldPoint=session=>{const w=session.game.world;return w?.mode==='road'?w.walkHome?.native?.point||null:w?.mode==='native'?w.nativePosition||null:null;};
