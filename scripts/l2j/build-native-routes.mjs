import fs from 'node:fs';
import {createHash} from 'node:crypto';
import nativeWorld from '../../template/nativeWorld.js';
import {WORLD_EXTENSION} from '../../template/worldExtension.js';
import surfaceEntries from '../../template/nativeSurfaceEntries.js';
import {LOCATIONS} from '../../template/worldMap.js';
import {worldGeodata} from '../../functions/game/world/l2jGeodata.js';
import {findNativePath,nativeSegment} from '../../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../../functions/game/world/nativeGround.js';

const ids=process.argv.slice(2),routes={};
const candidates=[...WORLD_EXTENSION.filter(r=>r.levels.source?.coordinateSpace==='surface').map(r=>r.location),...LOCATIONS.filter(l=>surfaceEntries[l.id])];
for(const target of candidates){
 if(ids.length&&!ids.includes(target.id))continue;
 const from=nativeWorld.towns[target.region],to={x:target.x,y:target.y,z:target.z};
 let result={ok:false,reason:'source_anchor_missing'},attempts=[];
 if(from)for(const [stride,maxNodes,heuristicWeight=1,margin=256] of [[8,30000],[4,30000],[2,50000],[1,60000],[8,120000,2,1024],[4,120000,2,1024]]){
  const start=performance.now();result=findNativePath(from,to,{allowed:nativeGroundAllowed,stride,maxNodes,heuristicWeight,margin,reversible:true});
  attempts.push({stride,maxNodes,heuristicWeight,margin,visited:result.visited||0,reason:result.reason||null});
  console.log(target.id,stride,result.ok,result.reason||'',result.visited,Math.round(performance.now()-start)+'ms');
  if(result.ok)break;
 }
 if(!result.ok){routes[target.id]={city:target.region,available:false,to,sourceEntry:target.entrySource,reason:result.reason,attempts};continue;}
 let previous=result.start,distance=0;
 for(const point of result.path){
  if(!nativeSegment(previous,point,{allowed:nativeGroundAllowed}))throw new Error('Invalid native route segment: '+target.id);
  distance+=Math.hypot(point.x-previous.x,point.y-previous.y);previous=point;
 }
 const vertices=[{x:from.x,y:from.y,z:result.start.z},...result.path],returnPath=vertices.slice(0,-1).reverse();
 let back=vertices.at(-1),reversible=true;
 for(const point of returnPath){if(!nativeSegment(back,point,{allowed:nativeGroundAllowed})){reversible=false;break;}back=point;}
 routes[target.id]={city:target.region,available:true,from:vertices[0],to:vertices.at(-1),sourceTown:from,sourceEntry:target.entrySource,distance,path:result.path,returnPath:reversible?returnPath:null,attempts};
}
const file='template/nativeRoutes.js';
const previous=fs.existsSync(file)?(await import(new URL('../../template/nativeRoutes.js',import.meta.url))).default:null;
const result={geodataCommit:worldGeodata.manifest.commit,worldCommit:nativeWorld.source.commit,barriersSha256:createHash('sha256').update(fs.readFileSync('template/nativeWorld.js')).digest('hex'),routes:{...previous?.routes,...routes}};
fs.writeFileSync(file,'// Native H5 ground routes. Every segment verified against original 16-unit cells and ground exclusions.\n// Derived from L2J High Five geodata (GPL-3.0); see data/l2j-geodata/LICENSE.\nexport default '+JSON.stringify(result,null,2)+';\n');
console.log('Native routes',Object.values(result.routes).filter(r=>r.available).length+'/'+Object.keys(result.routes).length);
