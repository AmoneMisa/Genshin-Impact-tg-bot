import compiled from '../../../template/nativeTownRoutes.js';
import fields from '../../../template/nativeRoutes.js';
import nativeWorld from '../../../template/nativeWorld.js';
import {CITIES} from '../../../template/worldMap.js';
import {worldGeodata} from './l2jGeodata.js';
import {pointInPolygon} from './navigation.js';

const adjacency=new Map(),cache=new Map();
const sources={...nativeWorld.towns,...compiled.towns};
export const nativeTownSource=id=>sources[id]||null;
function add(from,to,route,start,path){const list=adjacency.get(from)||[];list.push({to,distance:route.distance,start,path});adjacency.set(from,list);}
for(const route of Object.values(compiled.routes).filter(r=>r.available&&r.returnPath)){
 add(route.fromCity,route.toCity,route,route.from,route.path);
 add(route.toCity,route.fromCity,route,route.to,route.returnPath);
}
export function nativeTownHub(id){
 const edge=adjacency.get(id)?.[0];if(edge)return edge.start;
 const field=Object.values(fields.routes).find(r=>r.available&&r.city===id);if(field)return field.from;
 const source=nativeTownSource(id);return source?worldGeodata.point(source):null;
}
export function nativeTownCities(from){
 const found=new Set([from]),queue=[from];
 while(queue.length)for(const edge of adjacency.get(queue.shift())||[])if(!found.has(edge.to)){found.add(edge.to);queue.push(edge.to);}
 return [...found];
}
/** Dijkstra joins only source-verified edges; no straight-line edge is synthesized. */
export function nativeTownPath(from,to){
 const id=from+':'+to;if(cache.has(id))return cache.get(id);
 if(from===to){const start=nativeTownHub(from);return start?{start,path:[],cities:[from],distance:0}:null;}
 const open=[from],costs=new Map([[from,0]]),came=new Map(),closed=new Set();
 while(open.length){
  open.sort((a,b)=>costs.get(b)-costs.get(a));const city=open.pop();if(closed.has(city))continue;closed.add(city);
  if(city===to){
   const edges=[],cities=[to];for(let at=to;at!==from;){const previous=came.get(at);edges.push(previous.edge);at=previous.city;cities.push(at);}
   edges.reverse();cities.reverse();const result={start:edges[0].start,path:edges.flatMap(e=>e.path),cities,distance:costs.get(to)};cache.set(id,result);return result;
  }
  for(const edge of adjacency.get(city)||[]){
   const cost=costs.get(city)+edge.distance;if(cost>=(costs.get(edge.to)??Infinity))continue;
   costs.set(edge.to,cost);came.set(edge.to,{city,edge});open.push(edge.to);
  }
 }
 cache.set(id,null);return null;
}
/** Only original TownZone volumes can automatically change the current city. */
export function nativeCityAt(point){
 if(![point?.x,point?.y,point?.z].every(Number.isFinite))return null;
 return CITIES.find(c=>c.boundarySource&&point.z>=c.minZ&&point.z<=c.maxZ&&pointInPolygon(point,c.polygon))||null;
}
export const nativeTownEdges=()=>Object.values(compiled.routes).filter(r=>r.available&&r.returnPath);
