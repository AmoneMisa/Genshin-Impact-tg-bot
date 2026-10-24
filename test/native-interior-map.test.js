import {sampleNativeTerritory,nativeTerritorySource} from '../functions/game/world/nativeSpawnTerritory.js';
import {nativeFieldRooms} from '../functions/game/world/nativeFieldRooms.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import maps from '../template/nativeInteriorMaps.js';
import landmarks from '../template/nativeInteriorLandmarks.js';
import {MISSING_WORLD_SOURCE} from '../docs/missing-world-sources.js';
import {worldGeodata,geoCell,geoRegionId} from '../functions/game/world/l2jGeodata.js';
import {nativeInteriorMap} from '../functions/game/world/nativeInteriorMap.js';
import {pointInPolygon} from '../functions/game/world/navigation.js';
import {drawNativeInteriorMap} from '../webapp/native-interior-map.js';
for(const [key,map] of Object.entries(maps.maps))test(`${key}: vector cave footprint preserves covered source cells and original world scale`,()=>{
 const id=map.zone||key;
 const text=fs.readFileSync('webapp'+map.asset,'utf8'),d=text.match(/ d="([^"]+)"/)[1],polygons=d.split('M').filter(Boolean).map(s=>s.replace(/Z$/,'').split('L').map(p=>p.split(' ').map(Number)));
 assert.equal(createHash('sha256').update(text).digest('hex'),map.sha256);assert.equal(Buffer.byteLength(text),map.bytes);assert.ok(map.bytes<200000);assert.equal(maps.geodataCommit,worldGeodata.manifest.commit);
 for(const [file,sha] of Object.entries(map.files))assert.equal(sha,MISSING_WORLD_SOURCE.files[file]);
 const inside=point=>polygons.reduce((yes,polygon)=>yes!==pointInPolygon({x:(point.x-map.bounds.x)/16,y:(point.y-map.bounds.y)/16},polygon),false);
 const slots=nativeFieldRooms(id).filter(r=>!map.sourceFloor||r.sourceFloor===map.sourceFloor).flatMap(r=>r.spawns||[]);let checked=0,placementSeed=42;
 const placementRandom=()=>((placementSeed=(Math.imul(placementSeed,1664525)+1013904223)>>>0)/4294967296);
 for(const slot of slots){
  const points=slot.coordinateSource==='point'?[slot]:Array.from({length:3},()=>sampleNativeTerritory(nativeTerritorySource(id,slot),{random:placementRandom}));assert.ok(points.every(Boolean));
  for(const point of points){const floor=worldGeodata.point(point),roof=worldGeodata.point({...point,z:32767});if(roof.z<=floor.z)continue;assert.equal(inside(point),true,`${id} ${slot.id} ${point.x},${point.y}`);checked++;}
 }
 const markers=Object.entries(landmarks.zones[id]||{}).filter(([floor])=>!map.sourceFloor||Number(floor)===map.sourceFloor).map(([,m])=>m.point);
 for(const p of markers){assert.equal(inside(p),true);assert.equal(nativeInteriorMap(id,p,map.sourceFloor)?.asset,map.asset);checked++;}
 // Independent raw-layer check at deterministic vector samples. A filled
 // pixel must correspond to a real NSWE cell beneath another stored layer.
 let seed=42,filled=0,empty=0;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(const [region,sha] of Object.entries(map.regions))assert.equal(sha,worldGeodata.manifest.regions[region].sha256);
 for(let sample=0;sample<(id==='ivory-tower'?512:256);sample++){
  const x=Math.floor(random()*map.bounds.w/16),y=Math.floor(random()*map.bounds.h/16);let point={x:map.bounds.x+x*16+8,y:map.bounds.y+y*16+8};
  // The tower's peaceful interior is tiny compared with its hunting crater.
  // Also sample around its original NPCs, without weakening the raw-cell check.
  if(sample>=256){point={x:geoCell(Math.min(...markers.map(p=>p.x))-512+random()*(Math.max(...markers.map(p=>p.x))-Math.min(...markers.map(p=>p.x))+1024))*16+8,y:geoCell(Math.min(...markers.map(p=>p.y))-512+random()*(Math.max(...markers.map(p=>p.y))-Math.min(...markers.map(p=>p.y))+1024))*16+8};}
  const gx=(geoCell(point.x)%2048+2048)%2048,gy=(geoCell(point.y)%2048+2048)%2048,region=worldGeodata.region(geoRegionId(point.x,point.y)),bytes=region.bytes,offset=region.offsets[Math.floor(gx/8)*256+Math.floor(gy/8)],layers=[];
  if(bytes[offset]===2){let pos=offset+1;for(let i=0;i<(gx%8)*8+gy%8;i++)pos+=1+bytes[pos]*2;for(let i=0;i<bytes[pos];i++){const raw=bytes.readUInt16LE(pos+1+i*2);layers.push({z:(raw<<16>>16&~15)>>1,nswe:raw&15});}}
  const covered=layers.some(n=>n.nswe&&layers.some(roof=>roof.z>n.z)),painted=inside(point);
  if(painted){filled++;assert.ok(covered,`${id}: filled pixel without covered original ground`);}else empty++;
  if(!covered)assert.equal(painted,false);
 }
 assert.ok(filled>10&&empty>10);
 assert.ok(checked>=(map.sourceFloor?1:id==='ivory-tower'?5:101));assert.ok(map.layerCells>=map.cells);assert.equal(polygons.length,map.contours);
 assert.doesNotMatch(text,/<(?:script|image|animate|filter)|href=/);
});
test('surface entry keeps its original world tile; stored roofs select cave footprints',()=>{
 assert.equal(nativeInteriorMap('stakato-nest',{x:89513,y:-44800,z:-2136}),null);
 assert.equal(nativeInteriorMap('stakato-nest',{x:86388,y:-46376,z:-4640}).asset,maps.maps['stakato-nest'].asset);
 assert.equal(nativeInteriorMap('antharas-lair',{x:143544,y:110356,z:160}),null);
 assert.ok(nativeInteriorMap('antharas-lair',{x:143544,y:110356,z:-3944}));assert.equal(nativeInteriorMap('vuku-lands',{x:0,y:0,z:0}),null);
});

test('the original thirteenth-floor Angelic Vortex selects the tower footprint at its own height',()=>{
 const original={x:112624,y:14032,z:10080},point=worldGeodata.point(original);assert.equal(point.z,10072);
 assert.equal(nativeInteriorMap('tower-of-insolence',point)?.asset,maps.maps['tower-of-insolence'].asset);
 // The same XY on the actual roof must not be treated as the covered landing.
 const roof=worldGeodata.point({...point,z:32767});assert.equal(nativeInteriorMap('tower-of-insolence',roof),null);
});
test('an unavailable cave image still covers the surface with a lightweight floor backdrop',()=>{
 const operations=[],ctx={save(){},restore(){},fillRect(...v){operations.push(['fill',...v]);},drawImage(...v){operations.push(['image',...v]);}},map=maps.maps['stakato-nest'];
 assert.equal(drawNativeInteriorMap(ctx,map,{width:320,height:240,project:p=>p,pic:()=>({complete:true,naturalWidth:0})}),true);
 assert.equal(ctx.fillStyle,'#101412');assert.deepEqual(operations,[['fill',0,0,320,240]]);
});
