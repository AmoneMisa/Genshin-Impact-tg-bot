import fs from 'node:fs';
import {LOCATIONS} from '../../template/worldMap.js';
import {LOCATION_LEVELS} from '../../template/locationLevels.js';
import {getZone} from '../../functions/game/hunt/huntMobs.js';
import {roomLayout} from '../../functions/game/hunt/huntRooms.js';
import {nearestOpenPoint} from '../../functions/game/world/navigation.js';
const d=JSON.parse(fs.readFileSync('.tmp/treasure-source.json','utf8'));
let mapped=0,missing=0;
for(const g of d.groups)for(const t of g.territories){
 const x=t.polygon.reduce((s,p)=>s+p[0],0)/t.polygon.length,y=t.polygon.reduce((s,p)=>s+p[1],0)/t.polygon.length,z=(t.minZ+t.maxZ)/2;
 const candidates=LOCATIONS.filter(l=>{
  if(l.instance||l.continent==='gracia'||/^(catacomb-|necropolis-)/.test(l.id)||Math.hypot(l.x-x,l.y-y)>=15000)return false;
  const floors=LOCATION_LEVELS[l.id]?.floors;
  return !floors||floors.some(f=>f.rooms.some(r=>r.spawns.some(s=>s.z>=t.minZ&&s.z<=t.maxZ)));
 });
 const l=candidates.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
 if(!l||!getZone(l.id)){t.gate=null;missing++;continue;}
 const floors=LOCATION_LEVELS[l.id]?.floors.filter(f=>!f.ship&&f.sourceBounds);
 const f=floors?.sort((a,b)=>Math.min(...a.rooms.flatMap(r=>r.spawns.map(s=>Math.abs(z-s.z))))-Math.min(...b.rooms.flatMap(r=>r.spawns.map(s=>Math.abs(z-s.z)))))[0];
 const layout=roomLayout(getZone(l.id),f?.number||1),bounds=f?.sourceBounds||[Math.min(...l.polygon.map(p=>p[0])),Math.min(...l.polygon.map(p=>p[1])),Math.max(...l.polygon.map(p=>p[0])),Math.max(...l.polygon.map(p=>p[1]))];
 const col=Math.min(layout.cols-1,Math.max(0,Math.floor((x-bounds[0])/Math.max(1,bounds[2]-bounds[0])*layout.cols))),row=Math.min(layout.rows-1,Math.max(0,Math.floor((y-bounds[1])/Math.max(1,bounds[3]-bounds[1])*layout.rows)));
 const room=[...layout.rooms].sort((a,b)=>Math.hypot(a.col-col,a.row-row)-Math.hypot(b.col-col,b.row-row))[0];
 t.gate={zone:l.id,floor:f?.number||1,room:room.id,point:nearestOpenPoint({x:.5,y:.7},room.walls),geometry:'adapted',association:'nearest-source-anchor',sourcePosition:null};mapped++;
}
fs.writeFileSync('template/treasureChests.js','// Pinned High Five data. Source polygons are original; local markers are adapted.\nexport default '+JSON.stringify(d)+';\n');
console.log({groups:d.groups.length,slots:d.groups.reduce((s,g)=>s+g.maximumNpc,0),mappedTerritories:mapped,unmappedTerritories:missing});
