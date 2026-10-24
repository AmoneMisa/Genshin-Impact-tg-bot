import source from '../../../template/nativeFieldPilot.js';
import {worldGeodata} from './l2jGeodata.js';
import {nativeGroundAllowed} from './nativeGround.js';
import {pointInPolygon} from './navigation.js';

const geometry=new WeakMap();
export function nativeTerritorySource(zone,entry){
 if(!entry?.polygon?.length)return null;
 const key=(entry.sourceFile||entry.file)+':'+entry.sourceGroup;
 return {polygon:entry.polygon,minZ:entry.minZ,maxZ:entry.maxZ,bannedTerritories:source.territoryExclusions?.[zone]?.[key]||[]};
}
function bounds(territory){
 if(!territory||!Array.isArray(territory.polygon)||territory.polygon.length<3||!territory.polygon.every(p=>p.length===2&&p.every(Number.isInteger))||!Number.isInteger(territory.minZ)||!Number.isInteger(territory.maxZ)||territory.minZ>territory.maxZ)return null;
 let box=geometry.get(territory);if(!box){const xs=territory.polygon.map(p=>p[0]),ys=territory.polygon.map(p=>p[1]);box={left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};geometry.set(territory,box);}return box;
}
export function nativeSpawnDistance(point,spawn){
 if(spawn.coordinateSource==='point')return Math.hypot(spawn.x-point.x,spawn.y-point.y);
 const box=bounds(spawn);if(!box)return Infinity;
 // Only a residency bound; this never authorizes a spawn or a walk.
 return Math.hypot(Math.max(box.left-point.x,0,point.x-box.right),Math.max(box.top-point.y,0,point.y-box.bottom));
}
/** Exact territory/layer residency, without selecting a fictional NPC position. */
export function nativeTerritoryGround(territory,point,{geo=worldGeodata,allowed=nativeGroundAllowed}={}){
 if(!bounds(territory)||!point||!['x','y','z'].every(k=>Number.isFinite(point[k]))||!pointInPolygon(point,territory.polygon))return false;
 const ground=geo.point({...point,z:Math.trunc((territory.minZ+territory.maxZ)/2)});
 return Boolean(ground?.nswe&&ground.z===point.z&&ground.z<=territory.maxZ&&allowed(ground)&&!territory.bannedTerritories?.some(b=>ground.z>=b.minZ&&ground.z<=b.maxZ&&pointInPolygon(ground,b.polygon)));
}
/** H5 ZoneNPoly/NpcSpawnTerritory proposal rule, with fail-closed ground validation.
 * Original classes and MIT notices: art-source/geodata/spawns.
 * Unlike the source fallback, an exhausted search cannot produce an unchecked point.
 */
export function sampleNativeTerritory(territory,{random=Math.random,geo=worldGeodata,allowed=nativeGroundAllowed}={}){
 const box=bounds(territory);if(!box)return null;
 const integer=(low,high)=>{const value=random();return Number.isFinite(value)&&value>=0&&value<1?low+Math.floor(value*(high-low+1)):null;};
 const middle=Math.trunc((territory.minZ+territory.maxZ)/2);
 for(let attempt=0;attempt<source.territorySampling.geodataAttempts;attempt++){
  let p=null;
  for(let retry=0;retry<=source.territorySampling.polygonResamples;retry++){
   const x=integer(box.left,box.right),y=integer(box.top,box.bottom);if(x===null||y===null)return null;
   if(pointInPolygon({x,y},territory.polygon)){p={x,y,z:middle};break;}
  }
  if(!p)return null;
  const ground=geo.point(p);
  if(!ground?.nswe||ground.z>territory.maxZ||!allowed(ground))continue;
  if(territory.bannedTerritories?.some(b=>ground.z>=b.minZ&&ground.z<=b.maxZ&&pointInPolygon(ground,b.polygon)))continue;
  return {x:p.x,y:p.y,z:ground.z};
 }
 return null;
}
