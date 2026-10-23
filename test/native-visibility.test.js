import test from 'node:test';import assert from 'node:assert/strict';
import {nativeStaticSight,nativeSightRay} from '../functions/game/world/nativeVisibility.js';
import {nativeSegment} from '../functions/game/world/nativeNavigation.js';
import {L2jRegion} from '../functions/game/world/l2jGeodata.js';
const from={x:8,y:8,z:0},to={x:168,y:8,z:0};
test('visibility virtual height never changes the stored ground layer used for placement',()=>{
 const layer=Buffer.from([1,0x8f,0x0c]),block=Buffer.concat([Buffer.from([2]),...Array(64).fill(layer)]),flat=Buffer.from([0,0,0]);
 const region=new L2jRegion(Buffer.concat([block,...Array(65535).fill(flat)]));
 assert.equal(region.cell(0,0,0).z,1600);assert.deepEqual(region.losCell(0,0,0),{z:0,nswe:15,higherZ:1600});
 assert.equal(region.cell(0,0,0).z,1600);assert.deepEqual(region.losCell(0,0,2000),{z:1600,nswe:15,higherZ:2000});assert.equal(region.losCell(-1,0,0),null);
});
function terrain(height=0){return {losCell(x,y,z){return {z:x===5?height:0,higherZ:x===5?height:z,nswe:x===4?0:15};},cell(x,y,z){return {z:x===5?height:0,nswe:x===4?0:15};}};}
test('H5 sight can see over a low blocked movement edge, but not a wall above 48',()=>{
 const geo=terrain(40);assert.equal(nativeSegment(from,to,{geo}),null);assert.ok(nativeStaticSight(from,to,{geo}));
 assert.ok(nativeStaticSight(from,to,{geo:terrain(48)}));assert.equal(nativeStaticSight(from,to,{geo:terrain(56)}),false);
});
test('sight rejects missing geodata, dynamic volume vetoes and unbounded work',()=>{
 const geo=terrain();const original=geo.losCell;geo.losCell=(x,y,z)=>x===5?null:original(x,y,z);assert.equal(nativeStaticSight(from,to,{geo}),false);
 assert.equal(nativeStaticSight(from,to,{geo:terrain(),allowed:p=>p.x<80||p.x>100}),false);
 assert.equal(nativeStaticSight(from,{...to,x:100000},{geo:terrain()}),false);assert.equal(nativeStaticSight(from,{...to,z:40000},{geo:{losCell:(x,y,z)=>({z,nswe:15,higherZ:z})}}),false);
});
test('same XY on different floors cannot see through a ceiling; invalid inputs fail closed',()=>{
 const geo={losCell:(x,y,z)=>({z,nswe:15,higherZ:z})};assert.ok(nativeStaticSight(from,from,{geo}));assert.equal(nativeStaticSight(from,{...from,z:100},{geo}),false);
 assert.equal(nativeStaticSight(from,{...to,z:NaN},{geo}),false);
});
test('integer sight iterator includes both endpoints for vertical, negative and tied axes',()=>{
 for(const end of [{x:0,y:0,z:0},{x:-5,y:5,z:-5},{x:0,y:0,z:9},{x:9,y:3,z:-2}]){const points=[...nativeSightRay({x:0,y:0,z:0},end)];assert.deepEqual(points.at(-1),end);assert.equal(points.length,Math.max(Math.abs(end.x),Math.abs(end.y),Math.abs(end.z))+1);}
});
