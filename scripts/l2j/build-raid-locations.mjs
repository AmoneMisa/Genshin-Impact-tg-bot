import fs from 'node:fs';
import WORLD from '../../template/worldBosses.js';
import points from '../../template/worldBossMap.js';
import {CITIES,LOCATIONS} from '../../template/worldMap.js';
import {LOCATION_LEVELS} from '../../template/locationLevels.js';
import {sceneStudy} from '../../webapp/scene-catalog.js';

// World coordinates remain original. Scene selection and local marker placement are adaptations.
const result={};
for(const row of WORLD){
 const p=points[row.id];if(!p||row.grand)continue;
 const nearest=(rows)=>[...rows].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
 const city=nearest(CITIES),candidate=nearest(LOCATIONS.filter(l=>!l.instance));
 const inToi=Math.hypot(p.x-114000,p.y-16000)<7000&&p.z>-5500;
 const zone=inToi?LOCATIONS.find(l=>l.id==='tower-of-insolence'):Math.hypot(candidate.x-p.x,candidate.y-p.y)<15000?candidate:null;
 const levels=zone&&LOCATION_LEVELS[zone.id]?.floors;
 let floor;
 if(inToi){const heights=[-5100,-3750,-2250,-750,1000,2000,3000,4000,5000,6000,7000,8000,9559,11000];floor=heights.indexOf([...heights].sort((a,b)=>Math.abs(a-p.z)-Math.abs(b-p.z))[0])+1;}
 else if(levels){
  const distance=f=>{const zs=f.rooms.flatMap(r=>r.spawns.map(s=>s.z));return zs.length?Math.min(...zs.map(z=>Math.abs(z-p.z))):Infinity;};
  floor=[...levels].sort((a,b)=>distance(a)-distance(b))[0]?.number;
 }
 const level=levels?.find(f=>f.number===floor),bounds=level?.sourceBounds;
 const col=bounds?Math.min(3,Math.max(0,Math.floor((p.x-bounds[0])/Math.max(1,bounds[2]-bounds[0])*4))):0;
 const r=bounds?Math.min(2,Math.max(0,Math.floor((p.y-bounds[1])/Math.max(1,bounds[3]-bounds[1])*3))):0;
 const scene=sceneStudy(zone?.id),environment=level?.environment||scene?.environment||'woodland';
 result[row.id]={name:row.name,region:city.id,zone:zone?.id||null,location:zone?zone.name+(floor&&levels.length>1?' · '+floor+' этаж':''):'Окрестности '+city.name,
  sceneKey:zone?`${zone.id}:r${r}c${col}:floor-${floor||1}`:null,environment,
  gate:level&&!p.instance?{floor,room:`r${r}c${col}`,point:{x:.5,y:.5}}:null,
  associationSource:'geographic-source-anchor',sceneGeometry:'adapted',sourcePosition:p};
}
fs.writeFileSync('template/raidLocations.js','// Original world points; geographic associations and local room markers are authored.\nexport const RAID_LOCATIONS='+JSON.stringify(result)+';\n');
console.log('Geographic raid scenes:',Object.keys(result).length);
