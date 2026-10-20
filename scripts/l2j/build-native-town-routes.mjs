import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {TOWN_LINKS,TOWN_ANCHORS} from './native-town-targets.mjs';
import nativeWorld from '../../template/nativeWorld.js';
import fieldRoutes from '../../template/nativeRoutes.js';
import {worldGeodata,L2jGeodata} from '../../functions/game/world/l2jGeodata.js';
import {findNativePath,nativeSegment} from '../../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../../functions/game/world/nativeGround.js';

const viaOnly=process.argv.includes('--via-fields-only'),reverseOnly=process.argv.includes('--reverse-only');
if(viaOnly&&reverseOnly)throw new Error('Choose one search phase');
const rebuild=process.argv.includes('--rebuild');
const selected=process.argv.slice(2).filter(v=>!['--via-fields-only','--reverse-only','--rebuild'].includes(v)),file='template/nativeTownRoutes.js';
// Import work can retain its neighbouring regions; the live server cache stays at four.
const geo=new L2jGeodata({capacity:32});
const previous=fs.existsSync(file)?(await import(new URL('../../template/nativeTownRoutes.js',import.meta.url))).default:null;
const routes={...previous?.routes};
for(const [fromCity,toCity] of TOWN_LINKS){
 const id=[fromCity,toCity].sort().join(':');if(selected.length&&!selected.includes(id))continue;
 if(routes[id]?.available&&!rebuild){
  const route=routes[id],a=geo.point(TOWN_ANCHORS[fromCity]),b=geo.point(TOWN_ANCHORS[toCity]);
  const same=(p,q)=>p&&q&&['x','y','z'].every(k=>p[k]===q[k]);
  if(!same(route.from,a)||!same(route.to,b))throw new Error('Town anchor changed: '+id);
  let at=route.from;for(const next of route.path){if(!nativeSegment(at,next,{geo,allowed:nativeGroundAllowed,reversible:true}))throw new Error('Saved town segment changed: '+id);at=next;}
  if(!same(at,route.to))throw new Error('Saved town destination changed: '+id);
  for(const next of route.returnPath){if(!nativeSegment(at,next,{geo,allowed:nativeGroundAllowed,reversible:true}))throw new Error('Saved town return changed: '+id);at=next;}
  if(!same(at,route.from))throw new Error('Saved town return destination changed: '+id);
  console.log(id,'revalidated');continue;
 }
 const from=TOWN_ANCHORS[fromCity],to=TOWN_ANCHORS[toCity],attempts=viaOnly||reverseOnly?[...(previous?.routes[id]?.attempts||[])]:[];let plan={ok:false,reason:'source_path_missing'};
 for(const [stride,maxNodes,heuristicWeight,margin] of viaOnly||reverseOnly?[]:[[8,40000,1,256],[8,120000,2,1024],[4,120000,2,1024],[2,80000,2,1024],[8,180000,2,2048],[8,180000,4,2048]]){
  plan=findNativePath(from,to,{geo,allowed:nativeGroundAllowed,stride,maxNodes,heuristicWeight,margin,reversible:true});
  attempts.push({stride,maxNodes,heuristicWeight,margin,visited:plan.visited||0,reason:plan.reason||null});console.log(id,stride,plan.ok,plan.reason||'',plan.visited);
  if(plan.ok)break;
 }
 // A different starting cell changes the sampled grid and bounded queue order.
 // Reversing a found path is safe only because every segment is checked both ways.
 if(!plan.ok&&!viaOnly)for(const [stride,maxNodes,heuristicWeight,margin] of [[4,180000,2,2048],[8,180000,2,2048],[2,120000,4,2048]]){
  const reverse=findNativePath(to,from,{geo,allowed:nativeGroundAllowed,stride,maxNodes,heuristicWeight,margin,reversible:true});
  attempts.push({direction:'reverse',stride,maxNodes,heuristicWeight,margin,visited:reverse.visited||0,reason:reverse.reason||null});
  console.log(id,'reverse',stride,reverse.ok,reverse.reason||'',reverse.visited);
  plan=reverse.ok?{ok:true,start:reverse.path.at(-1),path:[reverse.start,...reverse.path.slice(0,-1)].reverse()}:reverse;
  if(plan.ok)break;
 }
 if(!plan.ok){
  const a=Object.entries(fieldRoutes.routes).filter(([,r])=>r.available&&r.returnPath&&r.city===fromCity),b=Object.entries(fieldRoutes.routes).filter(([,r])=>r.available&&r.returnPath&&r.city===toCity);
  const pairs=a.flatMap(([aid,ar])=>b.map(([bid,br])=>({aid,ar,bid,br,distance:Math.hypot(ar.to.x-br.to.x,ar.to.y-br.to.y)}))).sort((a,b)=>a.distance-b.distance);
  for(const {aid,ar,bid,br} of pairs.slice(0,4)){
   const bridge=findNativePath(ar.to,br.to,{geo,allowed:nativeGroundAllowed,stride:8,maxNodes:60000,heuristicWeight:2,margin:1024,reversible:true});
   attempts.push({viaFields:[aid,bid],stride:8,maxNodes:60000,heuristicWeight:2,margin:1024,visited:bridge.visited||0,reason:bridge.reason||null});
   console.log(id,'via',aid,bid,bridge.ok,bridge.reason||'',bridge.visited);
   if(bridge.ok){plan={ok:true,start:geo.point(from),path:[...ar.path,...bridge.path,...br.returnPath]};break;}
  }
 }
 if(!plan.ok){routes[id]={fromCity,toCity,available:false,reason:plan.reason,attempts};continue;}
 const vertices=[plan.start,...plan.path].map(({x,y,z})=>({x,y,z}));let distance=0;
 for(let i=1;i<vertices.length;i++){
  if(!nativeSegment(vertices[i-1],vertices[i],{geo,allowed:nativeGroundAllowed,reversible:true}))throw new Error('Invalid town segment: '+id);
  distance+=Math.hypot(vertices[i].x-vertices[i-1].x,vertices[i].y-vertices[i-1].y);
 }
 routes[id]={fromCity,toCity,available:true,from:vertices[0],to:vertices.at(-1),distance,path:vertices.slice(1),returnPath:vertices.slice(0,-1).reverse(),attempts};
}
const result={geodataCommit:worldGeodata.manifest.commit,worldCommit:nativeWorld.source.commit,barriersSha256:createHash('sha256').update(fs.readFileSync('template/nativeWorld.js')).digest('hex'),towns:TOWN_ANCHORS,routes};
fs.writeFileSync(file,'// Original H5 town links. All segments verified in both directions against native cells.\n// Derived from L2J High Five geodata (GPL-3.0); see data/l2j-geodata/LICENSE.\nexport default '+JSON.stringify(result,null,2)+';\n');
console.log('Verified town links:',Object.values(routes).filter(r=>r.available).length);
