import source from '../../../data/l2j-geodata/source.js';
import {nativeSegment} from './nativeNavigation.js';
import {nativeGroundAllowed} from './nativeGround.js';
import {worldGeodata} from './l2jGeodata.js';

export const nativeDistance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
/** Joined roads can retrace a shared branch. Remove only exact XYZ loops. */
export function pruneNativeLoops(from,path){
 if(![from,...path].every(p=>[p?.x,p?.y,p?.z].every(Number.isFinite)))return path;
 const key=p=>`${p.x},${p.y},${p.z}`,points=[from],indices=new Map([[key(from),0]]);
 for(const point of path){
  const id=key(point),at=indices.get(id);
  if(at!==undefined){while(points.length>at+1)indices.delete(key(points.pop()));}
  else{indices.set(id,points.length);points.push(point);}
 }
 // Preserve a zero-distance arrival at an entrance already reached on foot.
 return points.length>1?points.slice(1):path.length?[path.at(-1)]:[];
}
export function createNativeJourney(from,path,{now,speed,location=null,city=null}={}){
 if(!path.length||path.length>512||![from,...path].every(p=>[p?.x,p?.y,p?.z].every(Number.isFinite)))return null;
 let point=from,distance=0;
 for(const next of path){if(!nativeSegment(point,next,{allowed:nativeGroundAllowed}))return null;distance+=nativeDistance(point,next);point=next;}
 return {kind:'walk',routeGeometry:'l2j-geodata',location,city,until:now+Math.ceil(distance/Math.max(1,speed)*1000),native:{commit:source.commit,point:{x:from.x,y:from.y,z:from.z},legStart:{x:from.x,y:from.y,z:from.z},path:path.map(p=>({x:p.x,y:p.y,z:p.z})),index:0,moveAt:now,remaining:distance}};
}

/** Walk saved, source-verified segments with one distance budget across all region boundaries. */
export function advanceNativeJourney(trip,now,speed){
 const route=trip?.native;if(!route)return false;
 const elapsed=Math.max(0,now-route.moveAt);route.moveAt=Math.max(now,route.moveAt);
 if(route.commit!==source.commit){route.blocked='geodata_revision_changed';return false;}
 if(!Array.isArray(route.path)||!Number.isInteger(route.index)||route.index<0||route.index>route.path.length||route.path.length>512||![route.point?.x,route.point?.y,route.point?.z,route.legStart?.x,route.legStart?.y,route.legStart?.z,route.remaining].every(Number.isFinite)){route.blocked='path_blocked';return false;}
 if(route.blocked)return false;
 let budget=elapsed/1000*Math.max(0,speed);
 while(route.index<route.path.length&&budget>0){
  const next=route.path[route.index],distance=nativeDistance(route.point,next);
  const cells=nativeSegment(route.legStart,next,{allowed:nativeGroundAllowed});
  if(!cells){route.blocked='path_blocked';return false;}
  if(distance<=budget+1e-9){route.point={...next};route.legStart={...next};budget-=distance;route.remaining=Math.max(0,route.remaining-distance);route.index++;}
  else{
   const ratio=budget/distance,point={x:route.point.x+(next.x-route.point.x)*ratio,y:route.point.y+(next.y-route.point.y)*ratio,z:route.point.z+(next.z-route.point.z)*ratio};
   // The original leg defines its raster consistently across polls. Re-rasterizing
   // each shortened remainder can select a different side of a diagonal obstacle.
   const nearest=cells.reduce((best,p)=>nativeDistance(p,point)<nativeDistance(best,point)?p:best,route.legStart);
   const surface=worldGeodata.point({...point,z:nearest.z});
   if(!surface?.nswe||!nativeGroundAllowed(surface)){route.blocked='path_blocked';return false;}
   route.point={x:surface.x,y:surface.y,z:surface.z};route.remaining=Math.max(0,route.remaining-budget);budget=0;
  }
 }
 const done=route.index===route.path.length;
 trip.until=done?now:speed>0?now+Math.ceil(route.remaining/speed*1000):null;
 return done;
}

/** Keep the full authoritative route on the server, send only a short prediction window. */
export function nativeJourneyDto(trip){
 if(!trip?.native)return trip;
 const {native,...dto}=trip;
 return {...dto,blocked:native.blocked||null,remaining:native.remaining};
}
export function nativeJourneyPosition(trip){
 const route=trip?.native;if(!route)return null;
 return {worldPoint:{...route.point},worldPath:route.blocked?[]:route.path.slice(route.index,route.index+16).map(p=>({...p}))};
}
