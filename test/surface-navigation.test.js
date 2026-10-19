import test from 'node:test';
import assert from 'node:assert/strict';
import {planSurfaceRoute,surfacePathClear,surfaceRouteStep} from '../functions/game/world/surfaceNavigation.js';
import {enterHuntField,moveHuntField,advanceHunt,stopHuntAction,selectHuntTarget} from '../functions/game/hunt/huntFight.js';
import {roomLayout} from '../functions/game/hunt/huntRooms.js';
import {getZone} from '../functions/game/hunt/huntMobs.js';
import {ROOM_SIZE} from '../functions/game/world/navigation.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import getSpeed from '../functions/game/player/getters/getSpeed.js';
const NOW=1800000000000;
function grid(){return {rooms:Array.from({length:9},(_,i)=>({id:`r${Math.floor(i/3)}c${i%3}`,row:Math.floor(i/3),col:i%3,walls:[]}))};}
function legs(plan,room,from){return [{room:room.id,start:{x:from.x,y:from.y},path:plan.path},...(plan.crossing?.route||[])];}
function length(route){return route.reduce((total,leg)=>{let p=leg.start;for(const q of leg.path){total+=Math.hypot(q.x-p.x,q.y-p.y);p=q;}return total;},0);}
function validate(route,layout){
 for(let i=0;i<route.length;i++){
  const leg=route[i],room=layout.rooms.find(r=>r.id===leg.room);assert.ok(surfacePathClear(leg.start,leg.path,room.walls));
  assert.ok([leg.start,...leg.path].every(p=>p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1),'cell-local saved coordinates');
  if(i){const previous=layout.rooms.find(r=>r.id===route[i-1].room),end=route[i-1].path.at(-1);assert.equal(Math.abs(room.col-previous.col)+Math.abs(room.row-previous.row),1);assert.ok(Math.hypot(previous.col+end.x-room.col-leg.start.x,previous.row+end.y-room.row-leg.start.y)<1e-10);}
 }
}
function hero(){
 const s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(s,'humanFighter');updateStats(s);assert.ok(enterHuntField(s,'cruma-marshlands',{now:NOW,random:()=>.5}).ok);s.game.world={mode:'location',location:'cruma-marshlands'};
 Object.assign(s.game.hunt.field,{x:.8,y:.8});quiet(s);return s;
}
function quiet(s){const f=s.game.hunt.field;for(const m of [...f.mobs,...Object.values(f.rooms).flatMap(r=>r.mobs||[])])Object.assign(m,{aggressive:false,aggro:false,aggroRange:0,nextAttackAt:NOW+1e12});}

test('a diagonal destination is reached through two exact cardinal boundaries, never by a corner teleport',()=>{
 const layout=grid(),room=layout.rooms[0],from={x:.8,y:.8,walls:[]},plan=planSurfaceRoute(from,{x:1.3,y:1.25},layout,room);
 assert.ok(plan?.crossing);const route=legs(plan,room,from);assert.equal(route.length,3);assert.equal(route.at(-1).room,'r1c1');validate(route,layout);
 assert.deepEqual(route.at(-1).path.at(-1),{x:1.3-1,y:.25});
});
test('clear direct walks retain the exact transverse coordinate and need no grid detour',()=>{
 const layout=grid(),room=layout.rooms[0],from={x:.73,y:.617,walls:[]};
 const local=planSurfaceRoute(from,{x:.92,y:.617},layout,room);assert.deepEqual(local,{path:[{x:.92,y:.617}],crossing:null});
 const crossing=planSurfaceRoute(from,{x:1.31,y:.617},layout,room);assert.deepEqual(crossing.path,[{x:1,y:.617}]);assert.deepEqual(crossing.crossing.entry,{x:0,y:.617});validate(legs(crossing,room,from),layout);
});
test('an obstacle can be bypassed via a neighbour and the route may return to the same room',()=>{
 const layout=grid(),room=layout.rooms[0];room.walls=[{x:.45,y:0,w:.1,h:1}];const from={x:.2,y:.2,walls:room.walls};
 const plan=planSurfaceRoute(from,{x:.8,y:.2},layout,room);assert.ok(plan);const route=legs(plan,room,from);
 assert.ok(route.length>=3);assert.equal(route.at(-1).room,room.id);assert.ok(route.some(l=>l.room==='r1c0'));validate(route,layout);assert.ok(length(route)>1.6);
});
test('holes, outer edges, blocked endpoints and sub-grid thin walls cannot be crossed',()=>{
 const layout=grid(),room=layout.rooms[0],from={x:.2,y:.2,walls:[]};
 for(const point of [{x:2.2,y:.2},{x:-.2,y:.2},{x:Infinity,y:0},{x:NaN,y:0}])assert.equal(planSurfaceRoute(from,point,layout,room),null);
 layout.rooms=layout.rooms.filter(r=>!['r0c1','r1c0'].includes(r.id));assert.equal(planSurfaceRoute(from,{x:1.2,y:1.2},layout,room),null);
 const isolated={rooms:[{...room,walls:[{x:.5,y:0,w:.0001,h:1}]}]};
 assert.equal(planSurfaceRoute({...from,walls:isolated.rooms[0].walls},{x:.8,y:.2},isolated,isolated.rooms[0]),null,'segment tests block walls thinner than the search grid');
 assert.equal(planSurfaceRoute({...from,walls:[{x:.7,y:.1,w:.2,h:.2}]},{x:.8,y:.2},grid(),room),null);
});
test('multi-cell movement conserves one budget across save/load and small or large updates',()=>{
 const a=hero();assert.ok(moveHuntField(a,{x:1.2,y:1.2,zone:'hellbound',floor:99},NOW).ok);
 const initial=a.game.hunt.field,layout=roomLayout(getZone(a.game.hunt.zone)),route=legs({path:initial.path,crossing:initial.crossing},layout.rooms.find(r=>r.id===initial.room),initial),total=length(route),speed=getSpeed(a);
 const b=JSON.parse(JSON.stringify(a));const duration=Math.ceil((total+.1)*ROOM_SIZE/speed*1000);
 advanceHunt(a,NOW+duration,()=>.5);
 for(let elapsed=100;elapsed<duration;elapsed+=100)advanceHunt(b,NOW+elapsed,()=>.5);advanceHunt(b,NOW+duration,()=>.5);
 for(const s of [a,b]){const f=s.game.hunt.field;assert.equal(s.game.hunt.zone,'cruma-marshlands');assert.equal(f.floor,1);assert.equal(f.room,'r1c1');assert.ok(Math.hypot(f.x-.2,f.y-.2)<1e-10);assert.equal(f.crossing,undefined);assert.ok(f.visited.length>=3);}
 const c=hero();assert.ok(moveHuntField(c,{x:1.2,y:1.2},NOW).ok);const budget=.05;advanceHunt(c,NOW+budget*ROOM_SIZE/getSpeed(c)*1000,()=>.5);const f=c.game.hunt.field;
 assert.equal(f.room,'r0c0');assert.ok(Math.hypot(f.x-.8,f.y-.8)<=budget+1e-9,'a short tick grants no free boundary or final leg');
});
test('queued routes stop on target changes, Stop, death and immobilization',()=>{
 for(const cancel of [s=>stopHuntAction(s.game.hunt.field,NOW),s=>selectHuntTarget(s,s.game.hunt.field.mobs[0].instanceId,NOW),s=>s.game.gameClass.stats.hp=0,s=>s.game.effects.push({l2SkillId:1201,level:10,until:NOW+60000})]){
  const s=hero();assert.ok(moveHuntField(s,{x:1.2,y:1.2},NOW).ok);cancel(s);advanceHunt(s,NOW+30000,()=>.5);assert.equal(s.game.hunt.field.room,'r0c0');assert.equal(s.game.hunt.field.crossing,undefined);
 }
});
test('a queued next leg is rechecked against changed collisions before entering its room',()=>{
 const s=hero(),f=s.game.hunt.field;assert.ok(moveHuntField(s,{x:1.2,y:1.2},NOW).ok);
 const layout=roomLayout(getZone(s.game.hunt.zone)),to=layout.rooms.find(r=>r.id===f.crossing.room),before=to.walls;
 try{to.walls=[{x:0,y:0,w:1,h:1}];advanceHunt(s,NOW+60000,()=>.5);assert.equal(f.room,'r0c0');assert.equal(f.crossing,undefined);assert.equal(f.path.length,0);}finally{to.walls=before;}
});
test('a neighbour detour can return to the original live population without duplicating actors or rewards',()=>{
 const s=hero(),f=s.game.hunt.field,layout=roomLayout(getZone(s.game.hunt.zone)),room=layout.rooms.find(r=>r.id===f.room),walls=room.walls;
 const ids=f.mobs.map(m=>m.instanceId).sort(),gold=s.game.inventory.gold;
 try{
  room.walls=[{x:.45,y:0,w:.1,h:1}];Object.assign(f,{x:.2,y:.2,walls:room.walls});
  assert.ok(moveHuntField(s,{x:.8,y:.2},NOW).ok);assert.ok(f.crossing.route.length>=2);
  const saved=JSON.parse(JSON.stringify(s));advanceHunt(saved,NOW+120000,()=>.5);const result=saved.game.hunt.field;
  assert.equal(result.room,'r0c0');assert.ok(result.visited.some(id=>id!=='r0c0'));assert.ok(Math.hypot(result.x-.8,result.y-.2)<1e-10);
  assert.deepEqual(result.mobs.map(m=>m.instanceId).sort(),ids);assert.equal(result.rooms.r0c0,undefined);
  assert.equal(saved.game.inventory.gold,gold);assert.equal(saved.game.hunt.kills,0);assert.equal(result.crossing,undefined);
 }finally{room.walls=walls;}
});
test('saved route steps contain only room-local paths and continue without replanning',()=>{
 const layout=grid(),room=layout.rooms[4],from={x:.7,y:.7,walls:[]};const plan=planSurfaceRoute(from,{x:-.3,y:1.4},layout,room);assert.ok(plan);
 const copy=JSON.parse(JSON.stringify(plan)),next=surfaceRouteStep(copy.crossing.route);assert.deepEqual(next.path,copy.crossing.route[0].path);validate(legs(copy,room,from),layout);
});
