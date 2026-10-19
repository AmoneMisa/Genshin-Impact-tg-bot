import test from 'node:test';
import assert from 'node:assert/strict';
import {terrainStitchPlan} from '../webapp/terrain-stitch.js';
import {isoTerrain} from '../webapp/hunt-isometric.js';
const tile=(dx,dy)=>({id:`${dx}:${dy}`,dx,dy,environment:'woodland',sceneKey:'cruma-marshlands:r0c0:floor-1',walls:[{x:.95,y:.3,w:.06,h:.08,kind:'tree'}]});
test('surface joins follow only shared cardinal edges, and corners require four real cells',()=>{
 const tiles=Array.from({length:9},(_,i)=>tile(i%3-1,Math.floor(i/3)-1)),plan=terrainStitchPlan(tiles);
 assert.equal(plan.edges.length,12);assert.equal(plan.corners.length,4);
 for(const edge of plan.edges)assert.equal(Math.abs(edge.a.dx-edge.b.dx)+Math.abs(edge.a.dy-edge.b.dy),1);
 assert.deepEqual(terrainStitchPlan([tile(0,0),tile(1,1)]),{edges:[],corners:[]});
 const incomplete=terrainStitchPlan([tile(0,0),tile(1,0),tile(0,1)]);assert.equal(incomplete.edges.length,2);assert.equal(incomplete.corners.length,0);
});
test('blending reuses ground sources, keeps props out of clipped joins and leaves authoritative data intact',()=>{
 const tiles=[tile(0,0),tile(1,0),tile(0,1),tile(1,1)],field={environment:'woodland',walls:[],continuous:{space:'cruma-marshlands',tiles}},before=JSON.stringify(field);
 const svg=isoTerrain(field,{width:320,height:520});assert.equal(JSON.stringify(field),before);
 assert.equal((svg.match(/<image data-room-scene-art/g)||[]).length,4);assert.equal((svg.match(/data-terrain-props=/g)||[]).length,4);
 assert.equal((svg.match(/class="hunt-iso-prop /g)||[]).length,4,'each decoration is emitted once');
 assert.ok(svg.lastIndexOf('data-terrain-blend=')<svg.indexOf('data-terrain-props='),'all unclipped decorations follow the ground joins');
 assert.doesNotMatch(svg,/<canvas|<filter|<animate|hunt-iso-wall|class="iso-base"|class="iso-tile"/,'surface fallback has no floating board edges or checkerboard grid');
 for(const match of svg.matchAll(/<mask[^>]+width="([\d.]+)" height="([\d.]+)"/g))assert.ok(Number(match[1])*Number(match[2])<320*520,'mask allocation stays inside a narrow local seam');
});
test('join geometry stays attached to the same world edge after rebasing the current cell',()=>{
 const original=[tile(0,0),tile(1,0),tile(0,1),tile(1,1)],moved=original.map(t=>({...t,dx:t.dx-1}));
 const shape=(tiles,origin)=>terrainStitchPlan(tiles).edges.map(e=>[e.axis,e.at+(e.axis==='x'?origin:0),e.start+(e.axis==='y'?origin:0)]).sort();
 assert.deepEqual(shape(moved,1),shape(original,0));
});
