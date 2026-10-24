import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import maps from '../template/nativeInteriorMaps.js';
import {LOCATION_LEVELS} from '../template/locationLevels.js';
import {MISSING_WORLD_SOURCE} from '../docs/missing-world-sources.js';
import {worldGeodata,geoCell,geoRegionId} from '../functions/game/world/l2jGeodata.js';
import {nativeInteriorMap} from '../functions/game/world/nativeInteriorMap.js';
import {pointInPolygon} from '../functions/game/world/navigation.js';
import {drawNativeInteriorMap} from '../webapp/native-interior-map.js';
for(const [id,map] of Object.entries(maps.maps))test(`${id}: vector cave footprint preserves covered source cells and original world scale`,()=>{
 const text=fs.readFileSync('webapp'+map.asset,'utf8'),d=text.match(/ d="([^"]+)"/)[1],polygons=d.split('M').filter(Boolean).map(s=>s.replace(/Z$/,'').split('L').map(p=>p.split(' ').map(Number)));
 assert.equal(createHash('sha256').update(text).digest('hex'),map.sha256);assert.equal(Buffer.byteLength(text),map.bytes);assert.ok(map.bytes<200000);assert.equal(maps.geodataCommit,worldGeodata.manifest.commit);
 for(const [file,sha] of Object.entries(map.files))assert.equal(sha,MISSING_WORLD_SOURCE.files[file]);
 const inside=point=>polygons.reduce((yes,polygon)=>yes!==pointInPolygon({x:(point.x-map.bounds.x)/16,y:(point.y-map.bounds.y)/16},polygon),false);
 const slots=LOCATION_LEVELS[id].floors[0].rooms.flatMap(r=>r.spawns||[]);let checked=0;
 for(const slot of slots){const floor=worldGeodata.point(slot),roof=worldGeodata.point({...slot,z:32767});if(roof.z<=floor.z)continue;assert.equal(inside(slot),true,`${id} ${slot.id} ${slot.x},${slot.y}`);checked++;}
 // Independent raw-layer check at deterministic vector samples. A filled
 // pixel must correspond to a real NSWE cell beneath another stored layer.
 let seed=42,filled=0,empty=0;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(const [region,sha] of Object.entries(map.regions))assert.equal(sha,worldGeodata.manifest.regions[region].sha256);
 for(let sample=0;sample<256;sample++){
  const x=Math.floor(random()*map.bounds.w/16),y=Math.floor(random()*map.bounds.h/16),point={x:map.bounds.x+x*16+8,y:map.bounds.y+y*16+8};
  const gx=(geoCell(point.x)%2048+2048)%2048,gy=(geoCell(point.y)%2048+2048)%2048,region=worldGeodata.region(geoRegionId(point.x,point.y)),bytes=region.bytes,offset=region.offsets[Math.floor(gx/8)*256+Math.floor(gy/8)],layers=[];
  if(bytes[offset]===2){let pos=offset+1;for(let i=0;i<(gx%8)*8+gy%8;i++)pos+=1+bytes[pos]*2;for(let i=0;i<bytes[pos];i++){const raw=bytes.readUInt16LE(pos+1+i*2);layers.push({z:(raw<<16>>16&~15)>>1,nswe:raw&15});}}
  const covered=layers.some(n=>n.nswe&&layers.some(roof=>roof.z>n.z)),painted=inside(point);
  if(painted){filled++;assert.ok(covered,`${id}: filled pixel without covered original ground`);}else empty++;
  if(!covered)assert.equal(painted,false);
 }
 assert.ok(filled>10&&empty>10);
 assert.ok(checked>100);assert.ok(map.layerCells>=map.cells);assert.equal(polygons.length,map.contours);
 assert.doesNotMatch(text,/<(?:script|image|animate|filter)|href=/);
});
test('surface entry keeps its original world tile; stored roofs select cave footprints',()=>{
 assert.equal(nativeInteriorMap('stakato-nest',{x:89513,y:-44800,z:-2136}),null);
 assert.equal(nativeInteriorMap('stakato-nest',{x:86388,y:-46376,z:-4640}).asset,maps.maps['stakato-nest'].asset);
 assert.equal(nativeInteriorMap('antharas-lair',{x:143544,y:110356,z:160}),null);
 assert.ok(nativeInteriorMap('antharas-lair',{x:143544,y:110356,z:-3944}));assert.equal(nativeInteriorMap('vuku-lands',{x:0,y:0,z:0}),null);
});
test('an unavailable cave image still covers the surface with a lightweight floor backdrop',()=>{
 const operations=[],ctx={save(){},restore(){},fillRect(...v){operations.push(['fill',...v]);},drawImage(...v){operations.push(['image',...v]);}},map=maps.maps['stakato-nest'];
 assert.equal(drawNativeInteriorMap(ctx,map,{width:320,height:240,project:p=>p,pic:()=>({complete:true,naturalWidth:0})}),true);
 assert.equal(ctx.fillStyle,'#101412');assert.deepEqual(operations,[['fill',0,0,320,240]]);
});
