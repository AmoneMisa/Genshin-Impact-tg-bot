import fs from 'node:fs';
import {createHash} from 'node:crypto';
import nativeWorld from '../../template/nativeWorld.js';
import {WORLD_EXTENSION} from '../../template/worldExtension.js';
import surfaceEntries from '../../template/nativeSurfaceEntries.js';
import spawnEntries from '../../template/nativeSpawnEntries.js';
import territoryEntries from '../../template/nativeTerritoryEntries.js';
import {LOCATIONS} from '../../template/worldMap.js';
import {worldGeodata} from '../../functions/game/world/l2jGeodata.js';
import {findNativePath,nativeSegment} from '../../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../../functions/game/world/nativeGround.js';

const ids=process.argv.slice(2),routes={},file='template/nativeRoutes.js';
const previous=fs.existsSync(file)?(await import(new URL('../../template/nativeRoutes.js',import.meta.url))).default:null;
const barriersSha256=createHash('sha256').update(fs.readFileSync('template/nativeWorld.js')).digest('hex');
const candidates=[...WORLD_EXTENSION.filter(r=>r.levels.source?.coordinateSpace==='surface').map(r=>r.location),...LOCATIONS.filter(l=>surfaceEntries[l.id]||spawnEntries[l.id]||territoryEntries[l.id])];
for(const target of candidates){
 if(ids.length&&!ids.includes(target.id))continue;
 const from=nativeWorld.towns[target.region],to={x:target.x,y:target.y,z:target.z};
 let result={ok:false,reason:'source_anchor_missing'},attempts=[];
 if(from)for(const [stride,maxNodes,heuristicWeight=1,margin=256] of [[8,30000],[4,30000],[2,50000],[1,60000],[8,120000,2,1024],[4,120000,2,1024]]){
  const start=performance.now();result=findNativePath(from,to,{allowed:nativeGroundAllowed,stride,maxNodes,heuristicWeight,margin,reversible:true});
  attempts.push({stride,maxNodes,heuristicWeight,margin,visited:result.visited||0,reason:result.reason||null});
  console.log(target.id,stride,result.ok,result.reason||'',result.visited,Math.round(performance.now()-start)+'ms');
  if(result.ok)break;
  // A coarse lattice rooted at the town can miss a narrow entrance. Search
  // outward from that original entrance too, retaining the same cell checks.
  if(stride===8&&maxNodes===30000){
   const reverseStart=performance.now(),backward=findNativePath(to,from,{allowed:nativeGroundAllowed,stride:8,maxNodes:30000,heuristicWeight:2,margin:1024,reversible:true});
   const bounded=backward.ok&&backward.path.length<=512;
   attempts.push({direction:'reverse',stride:8,maxNodes:30000,heuristicWeight:2,margin:1024,visited:backward.visited||0,reason:backward.ok&&!bounded?'route_vertex_limit':backward.reason||null});
   console.log(target.id,'reverse',bounded,backward.reason||'',backward.visited,Math.round(performance.now()-reverseStart)+'ms');
   if(bounded){result={...backward,start:backward.path.at(-1),path:[backward.start,...backward.path.slice(0,-1)].reverse()};break;}
  }
 }
 // Reuse a published physical approach before declaring a gap. Only the final
 // branch needs bounded offline search; both directions are rechecked below.
 if(!result.ok&&previous?.geodataCommit===worldGeodata.manifest.commit&&previous.barriersSha256===barriersSha256){
  const near=Object.entries(previous.routes).filter(([id,r])=>id!==target.id&&r.available&&r.returnPath&&r.city===target.region&&r.from.x===from?.x&&r.from.y===from?.y&&Math.hypot(r.to.x-to.x,r.to.y-to.y)<=32768).sort((a,b)=>Math.hypot(a[1].to.x-to.x,a[1].to.y-to.y)-Math.hypot(b[1].to.x-to.x,b[1].to.y-to.y)).slice(0,4);
  for(const [id,via] of near){
   const start=performance.now(),branch=findNativePath(via.to,to,{allowed:nativeGroundAllowed,stride:8,maxNodes:30000,heuristicWeight:2,margin:1024,reversible:true});
   const bounded=branch.ok&&via.path.length+branch.path.length<=512;
   attempts.push({via:id,stride:8,maxNodes:30000,heuristicWeight:2,margin:1024,visited:branch.visited||0,reason:branch.ok&&!bounded?'route_vertex_limit':branch.reason||null});
   console.log(target.id,'via',id,bounded,branch.reason||'',branch.visited,Math.round(performance.now()-start)+'ms');
   if(bounded){result={...branch,start:via.from,path:[...via.path,...branch.path]};break;}
  }
 }
 if(!result.ok){routes[target.id]={city:target.region,available:false,to,sourceEntry:target.entrySource,reason:result.reason,attempts};continue;}
 let previousPoint=result.start,distance=0;
 for(const point of result.path){
  if(!nativeSegment(previousPoint,point,{allowed:nativeGroundAllowed}))throw new Error('Invalid native route segment: '+target.id);
  distance+=Math.hypot(point.x-previousPoint.x,point.y-previousPoint.y);previousPoint=point;
 }
 const vertices=[{x:from.x,y:from.y,z:result.start.z},...result.path],returnPath=vertices.slice(0,-1).reverse();
 let back=vertices.at(-1),reversible=true;
 for(const point of returnPath){if(!nativeSegment(back,point,{allowed:nativeGroundAllowed})){reversible=false;break;}back=point;}
 routes[target.id]={city:target.region,available:true,from:vertices[0],to:vertices.at(-1),sourceTown:from,sourceEntry:target.entrySource,distance,path:result.path,returnPath:reversible?returnPath:null,attempts};
}
const result={geodataCommit:worldGeodata.manifest.commit,worldCommit:nativeWorld.source.commit,barriersSha256,routes:{...previous?.routes,...routes}};
fs.writeFileSync(file,'// Native H5 ground routes. Every segment verified against original 16-unit cells and ground exclusions.\n// Derived from L2J High Five geodata (GPL-3.0); see data/l2j-geodata/LICENSE.\nexport default '+JSON.stringify(result,null,2)+';\n');
console.log('Native routes',Object.values(result.routes).filter(r=>r.available).length+'/'+Object.keys(result.routes).length);
