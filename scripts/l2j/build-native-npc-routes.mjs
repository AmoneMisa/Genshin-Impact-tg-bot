import fs from 'node:fs';import {createHash} from 'node:crypto';
import ports from '../../template/nativeFloorTransports.js';
import {findNativePath,nativeSegment} from '../../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed as allowed} from '../../functions/game/world/nativeGround.js';
import {worldGeodata} from '../../functions/game/world/l2jGeodata.js';
const zones={};
for(const zone of process.argv.slice(2)){
 const model=ports.zones[zone],routes=[];
 for(const [floor,values] of Object.entries(model)){
  const npcs=Array.isArray(values)?values:[values];
  const arrivals=Object.values(model).flatMap(v=>Array.isArray(v)?v:[v]).flatMap(p=>p.targets).filter(t=>!t.scenarioRequired).filter(t=>(t.floor===0?'entrance':String(t.floor))===floor).flatMap(t=>[t.point,...t.alternatives||[]]);
  for(const npc of npcs)for(const from of [...arrivals,...npcs.filter(p=>p!==npc).map(p=>p.point)]){
   if(Math.hypot(from.x-npc.point.x,from.y-npc.point.y,from.z-npc.point.z)<=250)continue;
   const plan=findNativePath(from,npc.point,{allowed,stride:4,maxNodes:200000,margin:2048,heuristicWeight:2,reversible:true});
   if(!plan.ok||plan.path.length>384)throw Error(JSON.stringify({zone,floor,npc:npc.name,from,result:plan}));
   let previous=plan.start;for(const p of plan.path){if(!nativeSegment(previous,p,{allowed,reversible:true}))throw Error('Invalid NPC walk');previous=p;}
   routes.push({floor,npcId:npc.npcId,from:plan.start,path:plan.path});console.log(zone,floor,npc.name,plan.path.length+' vertices');
  }
 }
 zones[zone]=routes;
}
fs.writeFileSync('template/nativeNpcRoutes.js','// Derived from L2J geodata (GPL-3.0); see data/l2j-geodata/LICENSE. Verified walks to pinned NPCs, never teleports.\nexport default '+JSON.stringify({geodataCommit:worldGeodata.manifest.commit,barriersSha256:createHash('sha256').update(fs.readFileSync('template/nativeWorld.js')).digest('hex'),transportSha256:createHash('sha256').update(fs.readFileSync('template/nativeFloorTransports.js','utf8').replace(/\r\n/g,'\n')).digest('hex'),zones},null,2)+';\n');
