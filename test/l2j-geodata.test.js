import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import source from '../data/l2j-geodata/source.js';
import {L2jRegion,L2jGeodata,worldGeodata,geoRegionId} from '../functions/game/world/l2jGeodata.js';
import {nativeStep,nativeSegment,findNativePath} from '../functions/game/world/nativeNavigation.js';
import {nativeGroundBlock} from '../functions/game/world/nativeGround.js';
import nativeWorld from '../template/nativeWorld.js';

function region(blocks=[]){
 const flat=Buffer.from([0,0x80,0xff]); // Signed flat height -128, not encoded complex height.
 return Buffer.concat(Array.from({length:65536},(_,i)=>blocks[i]||flat));
}
test('L2J binary decoding uses x-major blocks/cells, signed heights and independent layers',()=>{
 const complex=Buffer.alloc(129);complex[0]=1;
 for(let i=0;i<64;i++)complex.writeInt16LE((-256+i*8)*2|i%16,1+i*2);
 const layered=Buffer.concat([Buffer.from([2]),...Array.from({length:64},(_,i)=>{
  const b=Buffer.alloc(5);b[0]=2;b.writeInt16LE(-1024*2|3,1);b.writeInt16LE(256*2|12,3);return b;
 })]);
 const blocks=[];blocks[0]=complex;blocks[256]=layered;
 const data=new L2jRegion(region(blocks));
 assert.deepEqual(data.cell(0,0,0),{z:-256,nswe:0});
 assert.deepEqual(data.cell(1,2,0),{z:-176,nswe:10});
 assert.deepEqual(data.cell(0,8,0),{z:-128,nswe:15});
 assert.deepEqual(data.cell(8,0,-900),{z:-1024,nswe:3});
 assert.deepEqual(data.cell(8,0,240),{z:256,nswe:12});
 assert.deepEqual(data.cell(8,0,-384),{z:-1024,nswe:3},'equal-distance ties keep the first source layer');
 assert.equal(data.cell(-1,0,0),null);assert.equal(data.cell(2048,0,0),null);
});
test('truncated, unknown and invalid multilayer blocks are rejected',()=>{
 for(const data of [Buffer.alloc(0),Buffer.from([3]),Buffer.from([1,0]),Buffer.from([2,0]),Buffer.from([2,126])])assert.throws(()=>new L2jRegion(data));
 assert.throws(()=>new L2jRegion(Buffer.concat([region(),Buffer.from([0])])));
});
test('world regions preserve negative-coordinate boundaries; absent and empty regions stay closed',()=>{
 assert.equal(geoRegionId(-1,-1),'19_17');assert.equal(geoRegionId(0,0),'20_18');
 assert.equal(geoRegionId(32768,32768),'21_19');
 assert.equal(worldGeodata.point({x:-600000,y:-500000,z:0}),null);
 assert.equal(worldGeodata.point({x:40000,y:-150000,z:0}),null,'a repeated flat plane contains no verified ground detail');
});
test('source hashes are verified and the decompressed region cache is bounded',()=>{
 const blocks=[];blocks[1]=Buffer.from([0,0x88,0xff]);
 const bytes=region(blocks),packed=gzipSync(bytes),sha=b=>createHash('sha256').update(b).digest('hex'),entry={bytes:bytes.length,sha256:sha(bytes),compressedSha256:sha(packed)};
 const geo=new L2jGeodata({manifest:{regions:{'20_18':entry,'21_18':entry}},load:()=>packed,capacity:1});
 assert.equal(geo.point({x:0,y:0,z:0}).z,-128);geo.point({x:32768,y:0,z:0});assert.equal(geo.cache.size,1);
 const broken=new L2jGeodata({manifest:{regions:{'20_18':entry}},load:()=>Buffer.from('bad')});
 assert.throws(()=>broken.region('20_18'),/checksum/);
 assert.equal(broken.point({x:0,y:0,z:0}),null,'server movement fails closed without crashing the request');
 assert.ok(broken.errors.has('20_18'));
});
test('every published original region decodes and known H5 gatekeeper positions retain the correct ground layer',()=>{
 for(const id of Object.keys(source.regions))assert.doesNotThrow(()=>worldGeodata.region(id),id);
 assert.deepEqual(worldGeodata.point(nativeWorld.towns.aden),{x:146737,y:25807,z:-2008,nswe:15});
 assert.deepEqual(worldGeodata.point(nativeWorld.towns.giran),{x:83396,y:147904,z:-3400,nswe:15});
 for(const entry of Object.values(source.regions))assert.ok(fs.existsSync(new URL('../data/l2j-geodata/'+entry.file,import.meta.url)));
});
function grid(cells){
 const geo={cell(x,y,z){const layers=cells.get(x+':'+y);if(!layers)return null;return layers.reduce((a,b)=>Math.abs(b.z-z)<Math.abs(a.z-z)?b:a);}};
 geo.point=p=>{const c=geo.cell(Math.floor(p.x/16),Math.floor(p.y/16),p.z);return c?{x:p.x,y:p.y,...c}:null;};return geo;
}
test('native movement checks source NSWE, height increase, corner cells and destination layers',()=>{
 const cells=new Map();for(let x=0;x<4;x++)for(let y=0;y<4;y++)cells.set(x+':'+y,[{z:0,nswe:15}]);
 const geo=grid(cells),a={x:8,y:8,z:0},b={x:56,y:56,z:0};assert.ok(nativeSegment(a,b,{geo}));
 cells.set('0:1',[{z:0,nswe:14}]);assert.equal(nativeSegment(a,b,{geo}),null,'diagonal corner cannot be cut');
 cells.set('0:1',[{z:0,nswe:15}]);cells.set('1:0',[{z:48,nswe:15}]);
 assert.equal(nativeStep(geo,{gx:0,gy:0,z:0,nswe:15},1,0),null,'source maximum upward increase is 40');
 cells.set('1:0',[{z:0,nswe:15}]);cells.set('3:3',[{z:0,nswe:15},{z:512,nswe:15}]);
 assert.equal(nativeSegment(a,{...b,z:512},{geo}),null,'a bridge layer is not reached by sharing XY');
 assert.equal(nativeSegment(a,{x:1000,y:1000,z:0},{geo}),null);
});
test('bounded native search finds a real detour and fails closed when the work budget is exhausted',()=>{
 const cells=new Map();for(let x=0;x<7;x++)for(let y=0;y<7;y++)cells.set(x+':'+y,[{z:0,nswe:x===3&&y<5?0:15}]);
 const geo=grid(cells),from={x:8,y:8,z:0},to={x:104,y:8,z:0};
 assert.equal(nativeSegment(from,to,{geo}),null);
 const route=findNativePath(from,to,{geo,stride:1,maxNodes:200,margin:6,reversible:true});assert.ok(route.ok);
 assert.ok(route.path.some(p=>p.y>=88),'walks through the actual opening');
 let p=from;for(const q of route.path){assert.ok(nativeSegment(p,q,{geo,reversible:true}));p=q;}
 assert.equal(findNativePath(from,to,{geo,stride:1,maxNodes:1,margin:6}).reason,'geodata_search_limit');
});
test('water, holding interiors and door volumes cannot become public walking shortcuts',()=>{
 const water=nativeWorld.water.find(z=>z.shape==='Cuboid'),[a,b]=water.polygon;
 assert.equal(nativeGroundBlock({x:(a[0]+b[0])/2,y:(a[1]+b[1])/2,z:(water.minZ+water.maxZ)/2}),'swimming_required');
 const door=nativeWorld.doors.find(d=>d.polygon.every(p=>p[0]>0&&p[1]>0));
 const x=door.polygon.reduce((n,p)=>n+p[0],0)/4,y=door.polygon.reduce((n,p)=>n+p[1],0)/4;
 assert.ok(['door_state_required','holding_region_required'].includes(nativeGroundBlock({x,y,z:door.minZ+8})));
});
