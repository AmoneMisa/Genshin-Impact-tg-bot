import {worldGeodata} from './l2jGeodata.js';
import {nativeSegment} from './nativeNavigation.js';
import {nativeGroundAllowed} from './nativeGround.js';
const same=(a,b)=>a&&b&&['x','y','z'].every(k=>Math.abs(a[k]-b[k])<1e-7);
const xyz=p=>({x:p.x,y:p.y,z:p.z});
const surface=p=>[p?.x,p?.y,p?.z].every(Number.isFinite)&&worldGeodata.point(p)?.z===p.z;
/** Keep a bounded, reversible physical breadcrumb trail; never send it to the client. */
export function rememberNativeTrail(world,trip){
 const route=trip?.native;if(!route?.historyStart||route.blocked||route.commit!==worldGeodata.manifest.commit||!Array.isArray(route.path)||!Number.isInteger(route.index)||route.index<0||route.index>route.path.length)return false;
 if(![route.historyStart,route.point,...route.path.slice(0,route.index)].every(p=>[p?.x,p?.y,p?.z].every(Number.isFinite)))return false;
 let points=[route.historyStart,...route.path.slice(0,route.index),route.point].filter((p,i,all)=>!i||!same(p,all[i-1])).map(xyz);
 if(points.length<2)return false;
 const old=world.nativeTrail,island=world.nativeIsland||null;
 if(old?.commit===route.commit&&old.island===island&&Array.isArray(old.points)&&same(old.points.at(-1),points[0])&&old.points.length+points.length-1<=512)points=[...old.points.slice(0,-1),...points];
 if(points.length>512)return false;
 if(!points.every(surface))return false;
 for(let i=1;i<points.length;i++)if(!nativeSegment(points[i-1],points[i],{allowed:nativeGroundAllowed,reversible:true}))return false;
 world.nativeTrail={commit:route.commit,island,points};return true;
}
export function nativeTrailBack(world){
 const trail=world.nativeTrail;if(trail?.commit!==worldGeodata.manifest.commit||trail.island!==(world.nativeIsland||null)||!Array.isArray(trail.points)||trail.points.length<2||trail.points.length>512||!same(trail.points.at(-1),world.nativePosition))return null;
 if(!trail.points.every(surface))return null;
 for(let i=1;i<trail.points.length;i++)if(!nativeSegment(trail.points[i-1],trail.points[i],{allowed:nativeGroundAllowed,reversible:true}))return null;
 return {root:trail.points[0],path:trail.points.slice(0,-1).reverse().map(xyz)};
}
