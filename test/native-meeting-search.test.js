import test from 'node:test';
import assert from 'node:assert/strict';
import {meetNativePath,nativeMeetingSeeds} from '../scripts/l2j/meet-native-path.mjs';
import {nativeSegment} from '../functions/game/world/nativeNavigation.js';
function grid(size=10){
 const cells=new Map();for(let x=0;x<size;x++)for(let y=0;y<size;y++)cells.set(`${x}:${y}`,[{z:0,nswe:15}]);
 const geo={cell(x,y,z){return cells.get(`${x}:${y}`)?.reduce((a,b)=>Math.abs(b.z-z)<Math.abs(a.z-z)?b:a)||null;}};
 geo.point=p=>{const c=geo.cell(Math.floor(p.x/16),Math.floor(p.y/16),p.z);return c?{...p,...c}:null;};return {geo,cells};
}
function verify(plan,geo,to,allowed=()=>true){
 assert.ok(plan.ok);let at=plan.start;for(const next of plan.path){assert.ok(nativeSegment(at,next,{geo,allowed,reversible:true}));at=next;}assert.deepEqual({x:at.x,y:at.y,z:at.z},to);
}
test('meeting frontiers connect different grid phases around an actual wall',()=>{
 const {geo,cells}=grid();for(let y=0;y<6;y++)cells.set(`4:${y}`,[{z:0,nswe:0}]);
 const from={x:8,y:8,z:0},to={x:120,y:24,z:0};
 const plan=meetNativePath(from,to,{geo,stride:2,maxNodes:200,margin:10});verify(plan,geo,to);
 assert.ok(plan.path.some(p=>p.y>=104),'the wall is passed through its opening');
 assert.equal(meetNativePath(from,to,{geo,stride:2,maxNodes:1}).reason,'geodata_search_limit');
});
test('meeting search keeps bridge layers, missing ground and forbidden volumes separate',()=>{
 const {geo,cells}=grid(6);for(const key of cells.keys())cells.set(key,[{z:0,nswe:15},{z:512,nswe:15}]);
 const from={x:8,y:8,z:0},to={x:72,y:72,z:512};
 assert.equal(meetNativePath(from,to,{geo,stride:1,maxNodes:100,margin:5}).ok,false);
 assert.equal(meetNativePath(from,{x:1e6,y:1e6,z:0},{geo}).reason,'geodata_missing');
 assert.equal(meetNativePath(from,{...to,z:0},{geo,stride:1,maxNodes:100,allowed:p=>p.x<40||p.x>56}).ok,false);
});
test('verified source trails seed the frontier but cannot add a teleport across a wall',()=>{
 const {geo,cells}=grid();for(let y=0;y<6;y++)cells.set(`4:${y}`,[{z:0,nswe:0}]);
 const from={x:8,y:8,z:0},to={x:120,y:24,z:0};
 const seed={from,path:[{x:8,y:120,z:0},{x:120,y:120,z:0}]};
 verify(meetNativePath(from,to,{geo,stride:2,maxNodes:100,fromSeeds:[seed]}),geo,to);
 assert.throws(()=>meetNativePath(from,to,{geo,fromSeeds:[{from,path:[to]}]}),/Unverified meeting seed/);
 // A trail belonging to another hub is ignored, even when its endpoint is close.
 assert.equal(meetNativePath(from,to,{geo,maxNodes:1,fromSeeds:[{from:{...from,z:1},path:[to]}]}).ok,false);
});

test('component seeds keep the entire town road and field trail and reject mismatched hubs',()=>{
 const {geo,cells}=grid();for(let y=0;y<6;y++)cells.set(`4:${y}`,[{z:0,nswe:0}]);
 const a={x:8,y:8,z:0},b={x:8,y:120,z:0},c={x:120,y:120,z:0},to={x:120,y:24,z:0};
 const road={available:true,fromCity:'a',toCity:'b',from:a,to:b,path:[b],returnPath:[a],distance:112};
 const seeds=nativeMeetingSeeds('a',a,{road},{field:{available:true,city:'b',from:b,path:[c,to]}});
 assert.deepEqual(seeds.find(s=>s.id==='field:field').path,[b,c,to]);
 verify(meetNativePath(a,to,{geo,stride:2,maxNodes:100,fromSeeds:seeds}),geo,to);
 assert.deepEqual(nativeMeetingSeeds('a',a,{road:{...road,from:{...a,z:512}}},{}),[]);
 assert.deepEqual(nativeMeetingSeeds('a',a,{road},{field:{available:true,city:'b',from:{...b,z:512},path:[to]}}).map(s=>s.id),['town:b']);
});

test('offline refinement traverses a one-cell passage missed by a coarse lattice',()=>{
 const {geo,cells}=grid(14);for(let y=0;y<14;y++)if(y!==5)cells.set(`5:${y}`,[{z:0,nswe:0}]);
 const from={x:8,y:8,z:0},to={x:200,y:8,z:0};
 assert.equal(meetNativePath(from,to,{geo,stride:4,maxNodes:400}).ok,false);
 const plan=meetNativePath(from,to,{geo,stride:4,refine:true,maxNodes:400});verify(plan,geo,to);
 assert.ok(plan.path.some(p=>Math.floor(p.y/16)===5));
});
