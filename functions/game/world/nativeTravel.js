import routes from '../../../template/nativeRoutes.js';
import {CITIES,LOCATIONS} from '../../../template/worldMap.js';
import {findNativePath,nativeSegment} from './nativeNavigation.js';
import {nativeGroundAllowed} from './nativeGround.js';
import {createNativeJourney,pruneNativeLoops} from './nativeJourney.js';
import {outdoorPoint} from './holdingEntry.js';
import {worldGeodata,geoRegionId} from './l2jGeodata.js';
import {nativeTownPath,nativeTownCities,nativeTownHub,nativeTownEdges,nativeTownSource} from './nativeTownGraph.js';
import ports from '../../../template/nativePortRoutes.js';
import islands from '../../../template/nativeIslandRoutes.js';
import {nativeTrailBack,resumeNativeJourney} from './nativeTrail.js';

export const nativeRoute=id=>islands.routes[id]?.available?islands.routes[id]:routes.routes[id]?.available?routes.routes[id]:null;
export const nativeApproachKnown=id=>Object.hasOwn(routes.routes,id)||Object.hasOwn(islands.routes,id);
export const nativeIsland=session=>session.game.world.mode==='location'?nativeRoute(session.game.world.location)?.island||null:session.game.world.nativeIsland||null;
export const nativeIslandPort=session=>Object.values(islands.routes).find(r=>r.island===nativeIsland(session))?.isolatedPort||null;
export function nativePortRoute(id,stop='vendor'){
 const route=ports.routes[id];if(!route||!['vendor','boarding'].includes(stop))return null;
 return {...route,path:stop==='vendor'?route.path.slice(0,route.vendorIndex):route.path,to:stop==='vendor'?route.vendor:route.to};
}
/** Rejoin an already verified trail locally instead of searching a whole long valley again. */
function reconnectNativeTrail(from,to,city,search=true){
 const candidates=[],destination=to?.city||city;
 for(const route of Object.values(routes.routes)){
  if(!route.available)continue;
  const link=nativeTownPath(route.city,destination);if(!link)continue;
  const vertices=[route.from,...route.path];
  for(let index=0;index<vertices.length;index++){
   const point=vertices[index],distance=Math.hypot(from.x-point.x,from.y-point.y);
   if(distance>8192)continue;
   const suffix=to===route?vertices.slice(index+1):[...vertices.slice(0,index).reverse(),...link.path,...(to?.path||[])];
   let remaining=0,previous=point;for(const next of suffix){remaining+=Math.hypot(next.x-previous.x,next.y-previous.y);previous=next;}
   candidates.push({point,suffix,score:distance+remaining});
  }
 }
 for(const route of [...nativeTownEdges(),...Object.values(ports.routes).filter(r=>!r.island).map(r=>({...r,fromCity:r.city,toCity:r.city}))]){
  const vertices=[route.from,...route.path];
  for(const [hub,forward] of route.fromCity===route.toCity?[[route.fromCity,false]]:[[route.fromCity,false],[route.toCity,true]]){
   const link=nativeTownPath(hub,destination);if(!link)continue;
   for(let index=0;index<vertices.length;index++){
    const point=vertices[index],distance=Math.hypot(from.x-point.x,from.y-point.y);if(distance>8192)continue;
    const suffix=[...(forward?vertices.slice(index+1):vertices.slice(0,index).reverse()),...link.path,...(to?.path||[])];
    let remaining=0,previous=point;for(const next of suffix){remaining+=Math.hypot(next.x-previous.x,next.y-previous.y);previous=next;}
    candidates.push({point,suffix,score:distance+remaining});
   }
  }
 }
 candidates.sort((a,b)=>a.score-b.score);
 // A nearby trail can share XY with an inaccessible layer or the far side of
 // a cliff. Check bounded cheap straight joins before spending six A* attempts
 // on those attractive but unreachable candidates.
 for(const {point,suffix} of candidates.slice(0,64)){
  if(nativeSegment(from,point,{allowed:nativeGroundAllowed,reversible:true}))return {ok:true,start:worldGeodata.point(from),path:[point,...suffix]};
 }
 for(const {point,suffix} of search?candidates.slice(0,6):[]){
  const prefix=findNativePath(from,point,{allowed:nativeGroundAllowed,maxNodes:1000,stride:2,margin:128,reversible:true});
  if(prefix.ok)return {...prefix,path:[...prefix.path,...suffix]};
 }
 return null;
}
function reconnectNativeHistory(world,to,city){
 const trail=nativeTrailBack(world);if(!trail)return null;
 // Reuse only a straight, fully checked root join; do not add more A* searches.
 const link=reconnectNativeTrail(trail.root,to,city,false);if(!link||trail.path.length+link.path.length>512)return null;
 return {ok:true,start:world.nativePosition,path:[...trail.path,...link.path]};
}
export function nativeExit(session){
 const w=session.game.world,f=session.game.hunt?.field,route=nativeRoute(w?.location);
 if(w?.mode!=='location'||session.game.hunt?.zone!==w.location||!route?.returnPath||!f)return null;
 const floor=LOCATIONS.find(l=>l.id===w.location)?.nativeEntryFloor||1;
 return {room:'r0c0',floor,point:{x:.5,y:.95},near:f.room==='r0c0'&&(f.floor||1)===floor&&Math.hypot(f.x-.5,f.y-.95)<=.08,city:route.city,island:route.island||null,port:route.isolatedPort||null};
}

/** Original entry/gatekeeper anchors bind local artwork to the native coordinate space. */
export function nativeTravel(session,target,now,speed){
 const w=session.game.world,to=target?.port?nativePortRoute(target.port,target.stop):target?.location&&nativeRoute(target.location),from=w.mode==='location'&&nativeRoute(w.location);
 let start,path,arrivalCity=target?.city||null;
 if(target?.location&&target.location===w.location&&w.mode==='location')return {ok:false,reason:'location_path_required'};
 const island=to?.island||from?.island||nativeIsland(session);
 if(island&&(to?.island!==island||arrivalCity))return {ok:false,reason:'location_path_required'};
 const resumed=resumeNativeJourney(w,target,now,speed);if(resumed){delete w.nativeResume;return {ok:true,trip:resumed};}
 if(island){
  if(to?.island!==island||arrivalCity)return {ok:false,reason:'location_path_required'};
  if(w.mode==='location'&&from?.island===island){
   if(!nativeExit(session)?.near)return {ok:false,reason:'entrance_required'};
   start=from.to;path=[...from.returnPath,...to.path];
  }else if(w.mode==='native'&&w.nativePosition&&Math.hypot(w.nativePosition.x-to.to.x,w.nativePosition.y-to.to.y)<=8192){
   const plan=findNativePath(w.nativePosition,to.to,{allowed:nativeGroundAllowed,maxNodes:6000,stride:2,reversible:true});
   if(!plan.ok)return plan;start=plan.start;path=plan.path;
  }else return {ok:false,reason:'location_path_required'};
 }else if(w.mode==='city'){
  if(arrivalCity===w.city)return {ok:false,reason:'already_in_city'};
  const link=nativeTownPath(w.city,to?.city||arrivalCity);if(!link)return {ok:false,reason:'location_path_required'};
  const point=outdoorPoint(session),town=nativeTownHub(w.city);
  if(!point||!town)return {ok:false,reason:'geodata_missing'};
  const prefix=findNativePath({...point,z:Number.isFinite(w.z)?w.z:town.z},link.start,{allowed:nativeGroundAllowed,maxNodes:6000,stride:2,reversible:true,heuristicWeight:2});
  if(!prefix.ok)return prefix;
  start=prefix.start;path=[...prefix.path,...link.path,...(to?.path||[])];
 }else if(w.mode==='location'&&from?.returnPath){
  if(!nativeExit(session)?.near)return {ok:false,reason:'entrance_required'};
  const link=nativeTownPath(from.city,to?.city||arrivalCity);if(!link)return {ok:false,reason:'location_path_required'};
  start=from.to;path=[...from.returnPath,...link.path,...(to?.path||[])];
 }else if(w.mode==='native'&&w.nativePosition){
  const endpoint=to?.to||nativeTownHub(arrivalCity);
  if(!endpoint)return {ok:false,reason:'location_path_required'};
  const nearby=target?.port&&Math.hypot(w.nativePosition.x-endpoint.x,w.nativePosition.y-endpoint.y)<=8192?findNativePath(w.nativePosition,endpoint,{allowed:nativeGroundAllowed,maxNodes:6000,stride:2,reversible:true}):null;
  const plan=(nearby?.ok?nearby:null)||reconnectNativeTrail(w.nativePosition,to,arrivalCity)||reconnectNativeHistory(w,to,arrivalCity)||findNativePath(w.nativePosition,endpoint,{allowed:nativeGroundAllowed,maxNodes:6000,reversible:true});
  if(!plan.ok)return plan;start=plan.start;path=plan.path;
 }else return {ok:false,reason:'location_path_required'};
 const trip=createNativeJourney(start,pruneNativeLoops(start,path),{now,speed,location:to?target.location:null,city:arrivalCity});
 if(trip){trip.native.target={location:target?.location||null,city:target?.city||null,port:target?.port||null,stop:target?.stop||'vendor'};delete w.nativeResume;}
 if(trip&&target?.port){trip.port=target.port;trip.portCity=to.city;}
 if(trip&&island)trip.island=island;
 return trip?{ok:true,trip}:{ok:false,reason:'path_blocked'};
}

export function nativeFreeWalk(session,point,now,speed){
 const w=session.game.world,city=CITIES.find(c=>c.id===w.city),town=w.mode==='city'&&nativeTownHub(w.city),local=w.mode==='city'&&outdoorPoint(session);
 const from=local?{...local,z:Number.isFinite(w.z)?w.z:city?.z??town?.z}:w.walkHome?.native?.point||w.nativePosition;
 if(!['city','native','road'].includes(w.mode)||!from||w.mode==='road'&&!w.walkHome?.native)return {ok:false,reason:'no_field'};
 const x=Number(point?.x),y=Number(point?.y);
 if(![x,y].every(Number.isFinite)||Math.hypot(x-from.x,y-from.y)>8192)return {ok:false,reason:'path_blocked'};
 // The client never selects a height, layer, room, instance, or zone.
 const plan=findNativePath(from,{x,y,z:from.z},{allowed:nativeGroundAllowed,maxNodes:6000,reversible:true});
 if(!plan.ok)return plan;
 const trip=createNativeJourney(plan.start,plan.path,{now,speed});
 if(trip){trip.native.historyStart={x:plan.start.x,y:plan.start.y,z:plan.start.z};delete w.nativeResume;}
 return trip?{ok:true,trip}:{ok:false,reason:'path_blocked'};
}

export function nativeWalkOptions(session){
 const w=session.game.world,exit=nativeExit(session);
 const island=nativeIsland(session);
 return Object.fromEntries(Object.entries({...routes.routes,...islands.routes}).filter(([,r])=>r.available).map(([id,r])=>{
  if(island||r.island)return [id,{enabled:Boolean(w.mode==='native'&&island===r.island),viaCity:null,exitRequired:w.mode==='location'&&!exit?.near}];
  const origin=w.mode==='location'?exit?.city:w.city,link=origin&&nativeTownPath(origin,r.city);
  return [id,{enabled:w.mode==='city'?Boolean(link):w.mode==='location'?Boolean(exit&&link&&id!==w.location):w.mode==='native',viaCity:null,exitRequired:w.mode==='location'&&!exit?.near}];
 }));
}
export function nativeWalkCities(session){
 const w=session.game.world;
 if(nativeIsland(session))return [];
 if(w.mode==='location'){const exit=nativeExit(session);return exit?.near?nativeTownCities(exit.city):[];}
 if(w.mode==='city')return nativeTownCities(w.city).filter(id=>id!==w.city);
 if(w.mode!=='native')return [];
 const realm=CITIES.find(c=>c.id===w.city)?.continent||'aden';
 return CITIES.filter(c=>{const town=nativeTownSource(c.id);return (c.continent||'aden')===realm&&town&&worldGeodata.manifest.regions[geoRegionId(town.x,town.y)];}).map(c=>c.id);
}

export const nativeWorldPoint=session=>{const w=session.game.world;return w?.mode==='road'?w.walkHome?.native?.point||null:w?.mode==='native'?w.nativePosition||null:null;};
