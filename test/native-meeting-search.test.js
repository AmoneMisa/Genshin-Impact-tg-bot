import test from 'node:test';
import assert from 'node:assert/strict';
import {meetNativePath,nativeMeetingSeeds,restoreNativeMeetingProgress} from '../scripts/l2j/meet-native-path.mjs';
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

test('refinement explores a narrow side branch even when the coarse road continues',()=>{
 const {geo,cells}=grid(33);
 // Two long roads end on the coarse lattice. Their only connection branches
 // between lattice nodes; reaching either end never forces a smaller step.
 for(const key of cells.keys()){const [x,y]=key.split(':').map(Number);if(y!==0&&y!==32&&x!==13)cells.delete(key);}
 const from={x:8,y:8,z:0},to={x:520,y:520,z:0};
 assert.equal(meetNativePath(from,to,{geo,stride:4,maxNodes:1000}).ok,false);
 verify(meetNativePath(from,to,{geo,stride:4,refine:true,maxNodes:1000}),geo,to);
});

test('bridge search starts at verified trail ends without paying their known length again',()=>{
 const {geo}=grid(100),from={x:8,y:8,z:0},to={x:1592,y:8,z:0};
 const trail=Array.from({length:20},(_,i)=>({x:8+i*16,y:i%2?8:1592,z:0}));
 const b={x:792,y:1592,z:0},c={x:904,y:1592,z:0},d={x:1592,y:1592,z:0};
 const plan=meetNativePath(from,to,{geo,stride:4,maxNodes:1,fromSeeds:[{from,path:[...trail,b]}],toSeeds:[{from:to,path:[d,c]}]});
 verify(plan,geo,to);assert.equal(plan.visited,1);
});

test('an exhausted offline search preserves only walked prefixes and cannot join them through a wall',()=>{
 const {geo,cells}=grid(33);for(let y=0;y<33;y++)cells.delete(`16:${y}`);
 const from={x:8,y:8,z:0},to={x:520,y:520,z:0};
 const plan=meetNativePath(from,to,{geo,stride:4,refine:true,maxNodes:20});assert.equal(plan.ok,false);assert.equal(plan.reason,'geodata_search_limit');
 assert.equal(plan.trails.length,2);
 for(const [i,trail]of plan.trails.entries()){
  assert.deepEqual(trail.from,i?to:from);assert.ok(trail.path.length);
  verify({ok:true,start:trail.from,path:trail.path},geo,plan.best[i]);
 }
 const retry=meetNativePath(from,to,{geo,stride:4,refine:true,maxNodes:100,fromSeeds:[plan.trails[0]],toSeeds:[plan.trails[1]]});assert.equal(retry.ok,false);
});

test('offline progress resumes only from matching source hubs and revalidated current cells and volumes',()=>{
 const {geo,cells}=grid(),stamp={geodataCommit:'geo',worldCommit:'world',barriersSha256:'barriers'},from={x:8,y:8,z:0},to={x:152,y:152,z:0};
 const record={stamp,trails:[[{from,path:[{x:8,y:72,z:0}]}],[{from:to,path:[{x:88,y:152,z:0}]}]]},options={stamp,from,to,geo};
 assert.deepEqual(restoreNativeMeetingProgress(record,options).map(s=>s.length),[1,1]);
 assert.deepEqual(restoreNativeMeetingProgress({...record,stamp:{...stamp,geodataCommit:'old'}},options),[[],[]]);
 const wrong=structuredClone(record);wrong.trails[0][0].from.z=512;assert.deepEqual(restoreNativeMeetingProgress(wrong,options).map(s=>s.length),[0,1]);
 assert.deepEqual(restoreNativeMeetingProgress(record,{...options,allowed:p=>p.y<40||p.y>60}).map(s=>s.length),[0,1]);
 cells.delete('0:3');assert.deepEqual(restoreNativeMeetingProgress(record,options).map(s=>s.length),[0,1]);
 assert.deepEqual(restoreNativeMeetingProgress({stamp,trails:[{bad:true},null]},options),[[],[]]);
 const invalid=structuredClone(record);invalid.trails[1][0].path=[{x:NaN,y:0,z:0}];assert.deepEqual(restoreNativeMeetingProgress(invalid,options),[[],[]]);
});
