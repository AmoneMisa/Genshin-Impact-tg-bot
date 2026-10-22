import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceTerritoryLayer} from '../scripts/l2j/source-territory-layer.mjs';
const node={x:13,y:17},allowed=()=>true;
const geo=(layers,nswe=15)=>({point:p=>layers.length?{x:p.x,y:p.y,z:layers.reduce((best,z)=>Math.abs(z-p.z)<Math.abs(best-p.z)?z:best),nswe}:null});
test('source territory keeps exact vertex XY and a unique original geodata layer',()=>{
 assert.deepEqual(sourceTerritoryLayer(geo([8]),node,0,16,allowed),{...node,z:8,nswe:15});
});
test('a bridge and an underground layer in one source interval cannot become a guessed middle floor',()=>{
 assert.equal(sourceTerritoryLayer(geo([40,120]),node,0,160,allowed),null);
 assert.equal(sourceTerritoryLayer(geo([-100,8,100]),node,-150,150,allowed),null);
});
test('missing, blocked and out-of-range source layers never produce a walking anchor',()=>{
 assert.equal(sourceTerritoryLayer(geo([]),node,0,16,allowed),null);
 assert.equal(sourceTerritoryLayer(geo([8],0),node,0,16,allowed),null);
 assert.equal(sourceTerritoryLayer(geo([40]),node,0,16,allowed),null);
 assert.equal(sourceTerritoryLayer(geo([8]),node,0,16,()=>false),null);
 assert.equal(sourceTerritoryLayer(geo([8]),node,16,0,allowed),null);
});
