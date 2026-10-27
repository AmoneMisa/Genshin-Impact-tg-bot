import fs from 'node:fs';import {createHash} from 'node:crypto';
import access from '../../template/paganAccess.js';
import {findNativePath,nativeSegment,nativeStep} from '../../functions/game/world/nativeNavigation.js';
import {nativeFallingStep,nativeFallEdge} from '../../functions/game/world/nativeFalling.js';
import {nativeGroundAllowed as allowed} from '../../functions/game/world/nativeGround.js';
import {worldGeodata,geoRegionId,geoCell,geoWorld} from '../../functions/game/world/l2jGeodata.js';

const point=p=>({x:p.x,y:p.y,z:p.z}),root=worldGeodata.point(access.mirrors[32040].to),mirror=worldGeodata.point(access.npcs[32039].point);
const plan=findNativePath(root,mirror,{allowed,step:nativeFallingStep,stride:1,maxNodes:50000,margin:256,heuristicWeight:2,heightWeight:4});
if(!plan.ok)throw Error('No verified church descent: '+plan.reason);
const stages=[];let previous=root,walkStart=root,walk=[];
function flush(){
 if(!walk.length)return;
 const route=findNativePath(walkStart,walk.at(-1),{allowed,stride:1,maxNodes:50000,margin:128,heuristicWeight:2,reversible:true});
 if(!route.ok||route.path.length>384)throw Error('No grounded church stage');
 stages.push({kind:'walk',from:point(route.start),path:route.path.map(point),to:point(route.path.at(-1))});walk=[];
}
for(const goal of plan.path){
 const cells=nativeSegment(previous,goal,{allowed,step:nativeFallingStep});if(!cells)throw Error('Invalid source descent segment');
 for(const next of cells){
  if(previous.z-next.z>40){
   flush();if(!nativeFallEdge(previous,next,{allowed}))throw Error('Invalid stored-layer drop');
   stages.push({kind:'fall',from:point(previous),to:point(next),height:previous.z-next.z,originalScriptPoint:null,geometry:'derived-stored-layer-descent'});walkStart=next;
  }else if(Math.hypot(next.x-previous.x,next.y-previous.y,next.z-previous.z)>1e-7)walk.push(next);
  previous=next;
 }
}
flush();if(!stages.some(s=>s.kind==='fall'))throw Error('Missing actual source-layer descent');
const regions=Object.fromEntries(stages.flatMap(s=>[s.from,s.to,...s.path||[]]).map(p=>{const id=geoRegionId(p.x,p.y);return [id,worldGeodata.manifest.regions[id].sha256];}));
const floorSeeds={3:[root,...stages[0].path],4:[mirror,...stages.slice(1).flatMap(s=>s.kind==='fall'?[s.to]:[s.from,...s.path])]},presentationBounds={};
for(const [floor,seeds]of Object.entries(floorSeeds)){
 const queue=[],seen=new Set();let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 function add(n){
  if(!n?.nswe||worldGeodata.cell(n.gx,n.gy,32767)?.z<=n.z)return;
  const key=n.gx+':'+n.gy+':'+n.z;if(seen.has(key))return;seen.add(key);queue.push(n);
  minX=Math.min(minX,geoWorld(n.gx)-8);maxX=Math.max(maxX,geoWorld(n.gx)+8);minY=Math.min(minY,geoWorld(n.gy)-8);maxY=Math.max(maxY,geoWorld(n.gy)+8);
  if(queue.length>200000)throw Error('Church covered component budget');
 }
 for(const seed of seeds)add({gx:geoCell(seed.x),gy:geoCell(seed.y),...worldGeodata.point(seed)});
 for(let at=0;at<queue.length;at++)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
  const n=queue[at],next=nativeStep(worldGeodata,n,dx,dy);if(!next)continue;
  const back=nativeStep(worldGeodata,next,-dx,-dy);if(back?.z===n.z)add(next);
 }
 if(!seen.size)throw Error('No original church roof cells');presentationBounds[floor]={x:minX,y:minY,w:maxX-minX,h:maxY-minY,cells:seen.size};
}
const value={geometry:'derived-from-original-layers',originalScriptJump:null,root:point(root),mirror:point(mirror),stages,floorSeeds,presentationBounds,source:{commit:access.source.commit,files:access.source.files,geodataCommit:worldGeodata.manifest.commit,regions,barriersSha256:createHash('sha256').update(fs.readFileSync('template/nativeWorld.js')).digest('hex')}};
fs.writeFileSync('template/paganChurchRoute.js','// Derived church ledges from original geodata, not an original scripted jump point.\nexport default '+JSON.stringify(value,null,2)+';\n');
console.log(stages.length+' source stages; falls: '+stages.filter(s=>s.kind==='fall').map(s=>s.height).join(', '));
