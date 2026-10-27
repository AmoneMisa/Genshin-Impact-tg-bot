import fs from 'node:fs';import {createHash} from 'node:crypto';
import ports from '../../template/nativeFloorTransports.js';
import {findNativePath,nativeSegment} from '../../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed as allowed} from '../../functions/game/world/nativeGround.js';
import {worldGeodata} from '../../functions/game/world/l2jGeodata.js';
import pilot from '../../template/nativeFieldPilot.js';
import {nativeFieldRooms} from '../../functions/game/world/nativeFieldRooms.js';
import {nativeTerritorySource,sampleNativeTerritory} from '../../functions/game/world/nativeSpawnTerritory.js';
const previous=(await import('../../template/nativeNpcRoutes.js')).default,zones={...previous.zones};
if(previous.geodataCommit!==worldGeodata.manifest.commit)throw Error('Rebuild NPC routes against the current geodata revision');
// Keep other zones when extending a single gate list. Each retained path must
// still end at the same pinned NPC and remain physically walkable both ways.
for(const [zone,routes]of Object.entries(zones))for(const r of routes){
 const values=ports.zones[zone]?.[r.floor],npc=(Array.isArray(values)?values:[values]).find(n=>n?.npcId===r.npcId),goal=npc&&worldGeodata.point(npc.point);
 if(!goal||!['x','y','z'].every(k=>r.path.at(-1)?.[k]===goal[k]))throw Error('Retained NPC endpoint changed: '+zone);
 let previous=r.from;for(const p of r.path){if(!nativeSegment(previous,p,{allowed,reversible:true}))throw Error('Retained NPC walk changed: '+zone);previous=p;}
}
for(const zone of process.argv.slice(2)){
 const model=ports.zones[zone],routes=[];
 for(const [floor,values] of Object.entries(model)){
  const npcs=Array.isArray(values)?values:[values];
  const arrivals=Object.values(model).flatMap(v=>Array.isArray(v)?v:[v]).flatMap(p=>p.targets).filter(t=>!t.scenarioRequired).filter(t=>(t.floor===0?'entrance':String(t.floor))===floor).flatMap(t=>[t.point,...t.alternatives||[]]);
  const witnesses=[];
  if(pilot.fields[zone]?.dungeon&&floor==='1')for(const room of nativeFieldRooms(zone)){
   const slot=room.spawns[0];if(!slot)continue;
   let state=42;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
   const point=slot.coordinateSource==='point'?slot:sampleNativeTerritory(nativeTerritorySource(zone,slot),{random});
   if(!point)throw Error('No verified dungeon walk witness: '+zone+' '+room.id);
   witnesses.push({point,witness:{type:slot.coordinateSource==='point'?'SOURCE_POINT':'TERRITORY_SAMPLE',originalEntrance:null,room:room.id,sourceGroup:slot.sourceGroup,file:slot.file||slot.sourceFile,...(slot.coordinateSource==='point'?{}:{seed:42})}});
  }
  for(const npc of npcs)for(const {point:from,witness} of [...arrivals,...npcs.filter(p=>p!==npc).map(p=>p.point)].map(point=>({point})).concat(witnesses)){
   if(Math.hypot(from.x-npc.point.x,from.y-npc.point.y,from.z-npc.point.z)<=250)continue;
   const plan=findNativePath(from,npc.point,{allowed,stride:4,maxNodes:200000,margin:2048,heuristicWeight:2,reversible:true});
   if(!plan.ok||plan.path.length>384)throw Error(JSON.stringify({zone,floor,npc:npc.name,from,result:plan}));
   let previous=plan.start;for(const p of plan.path){if(!nativeSegment(previous,p,{allowed,reversible:true}))throw Error('Invalid NPC walk');previous=p;}
   routes.push({floor,npcId:npc.npcId,from:plan.start,path:plan.path,...(witness?{witness}:{})});console.log(zone,floor,npc.name,plan.path.length+' vertices');
  }
 }
 zones[zone]=routes;
}
fs.writeFileSync('template/nativeNpcRoutes.js','// Derived from L2J geodata (GPL-3.0); see data/l2j-geodata/LICENSE. Verified walks to pinned NPCs, never teleports.\nexport default '+JSON.stringify({geodataCommit:worldGeodata.manifest.commit,barriersSha256:createHash('sha256').update(fs.readFileSync('template/nativeWorld.js')).digest('hex'),transportSha256:createHash('sha256').update(fs.readFileSync('template/nativeFloorTransports.js','utf8').replace(/\r\n/g,'\n')).digest('hex'),zones},null,2)+';\n');
