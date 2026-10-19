import test from 'node:test';
import assert from 'node:assert/strict';
import {enterHuntField,ensureHunt,advanceHunt} from '../functions/game/hunt/huntFight.js';
import {pursuePlayer} from '../functions/game/hunt/huntAi.js';
import {PURSUIT_SEARCHES_PER_TICK} from '../functions/game/hunt/huntPursuit.js';
import {actorEntries,battleActor,battleWalls} from '../functions/game/hunt/huntNeighborhood.js';
import {roomLayout} from '../functions/game/hunt/huntRooms.js';
import {getZone} from '../functions/game/hunt/huntMobs.js';
import {clearLine} from '../functions/game/hunt/huntSpatial.js';
import {planSurfaceApproach} from '../functions/game/world/surfaceNavigation.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000;
function fixture(){
 const s={userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:85,currentExp:0},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(s,'humanFighter');updateStats(s);enterHuntField(s,'cruma-marshlands',{now:NOW,random:()=>.5});s.game.world={mode:'location',location:'cruma-marshlands'};ensureHunt(s,NOW,()=>.5);
 for(const {mob} of actorEntries(s.game.hunt))Object.assign(mob,{aggressive:false,aggro:false,aggroRange:0,nextAttackAt:NOW+1e12});Object.assign(s.game.hunt.field,{x:.8,y:.2});return s;
}
function enemy(s,index=0,ai='fighter'){
 const m=s.game.hunt.field.mobs[index];Object.assign(m,{x:.2,y:.2,aggro:true,ai,lastMoveAt:NOW});return m;
}
function withWalls(s,walls,fn){const f=s.game.hunt.field,room=roomLayout(getZone(s.game.hunt.zone)).rooms.find(r=>r.id===f.room),old=room.walls;try{room.walls=walls;f.walls=walls;return fn();}finally{room.walls=old;}}
function point(h,id){const view=battleActor(h,id);return {x:view.x,y:view.y};}

test('a canonical pursuer detours through neighbouring cells and returns without cloning or changing its source slot',()=>{
 const s=fixture(),h=s.game.hunt,m=enemy(s),id=m.instanceId,source=[m.sourceRoom,m.sourceSlot],hp=m.currentHp;let crossed=false;
 withWalls(s,[{x:.45,y:0,w:.1,h:1}],()=>{
  for(let at=NOW+500;at<=NOW+60000;at+=500){
   const before=point(h,id);pursuePlayer(h,at);const after=point(h,id);assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<=.045+1e-9);
   const owners=actorEntries(h).filter(a=>a.mob.instanceId===id);assert.equal(owners.length,1);assert.equal(owners[0].mob,m);crossed||=owners[0].room.id!=='r0c0';
   if(Math.hypot(after.x-h.field.x,after.y-h.field.y)<=.2+1e-9&&clearLine(after,h.field,battleWalls(h)))break;
  }
  const after=point(h,id);assert.ok(crossed);assert.ok(h.field.mobs.includes(m));assert.ok(Math.hypot(after.x-h.field.x,after.y-h.field.y)<=.2+1e-9);assert.ok(clearLine(after,h.field,battleWalls(h)));
  assert.deepEqual([m.sourceRoom,m.sourceSlot],source);assert.equal(m.currentHp,hp);assert.equal(h.kills,0);
 });
});

test('existing fighter and mage stop distances remain unchanged on a clear path',()=>{
 for(const [ai,stop] of [['fighter',.2],['mage',.4]]){
  const s=fixture(),h=s.game.hunt,m=enemy(s,0,ai);pursuePlayer(h,NOW+5000);pursuePlayer(h,NOW+10000);
  assert.ok(Math.abs(Math.hypot(m.x-h.field.x,m.y-h.field.y)-stop)<1e-9);const before={x:m.x,y:m.y};pursuePlayer(h,NOW+15000);assert.deepEqual({x:m.x,y:m.y},before);
 }
});

test('a nearby monster separated by a thin wall walks around it instead of standing or attacking through it',()=>{
 const s=fixture(),h=s.game.hunt,m=enemy(s);Object.assign(h.field,{x:.55,y:.5});Object.assign(m,{x:.45,y:.5});
 withWalls(s,[{x:.49,y:.4,w:.02,h:.2}],()=>{
  const before=point(h,m.instanceId);pursuePlayer(h,NOW+500);const after=point(h,m.instanceId);assert.notDeepEqual(after,before);assert.equal(clearLine(after,h.field,battleWalls(h)),false);
  for(let at=NOW+1000;at<=NOW+15000;at+=500)pursuePlayer(h,at);
  assert.ok(clearLine(point(h,m.instanceId),h.field,battleWalls(h)));assert.ok(Math.hypot(m.x-h.field.x,m.y-h.field.y)<=.2+1e-9);
 });
});

test('pursuit routes survive saving mid-detour with identical positions and a single owner',()=>{
 const s=fixture(),h=s.game.hunt,m=enemy(s);
 withWalls(s,[{x:.45,y:0,w:.1,h:1}],()=>{
  pursuePlayer(h,NOW+2000);assert.ok(m.pursuit?.crossing);const copy=JSON.parse(JSON.stringify(s));
  for(let at=NOW+2500;at<=NOW+35000;at+=500){pursuePlayer(h,at);pursuePlayer(copy.game.hunt,at);assert.deepEqual(point(copy.game.hunt,m.instanceId),point(h,m.instanceId));assert.equal(actorEntries(copy.game.hunt).filter(a=>a.mob.instanceId===m.instanceId).length,1);}
 });
});

test('failed searches are cached until the target or collisions change',()=>{
 const s=fixture(),h=s.game.hunt,m=enemy(s);
 withWalls(s,[{x:.1,y:.1,w:.01,h:.2},{x:.3,y:.1,w:.01,h:.2},{x:.1,y:.1,w:.21,h:.01},{x:.1,y:.3,w:.21,h:.01}],()=>{
  pursuePlayer(h,NOW+1000);assert.equal(m.pursuit.blocked,true);const state=m.pursuit;pursuePlayer(h,NOW+2000);assert.equal(m.pursuit,state);assert.deepEqual({x:m.x,y:m.y},{x:.2,y:.2});
  h.field.x=.85;pursuePlayer(h,NOW+3000);assert.notEqual(m.pursuit,state);assert.equal(m.pursuit.blocked,true);
  h.field.walls=[];pursuePlayer(h,NOW+4000);assert.ok(m.x>.2);assert.ok(m.x<=.29+1e-9);assert.equal(m.pursuit.blocked,false);
 });
});

test('a crowd shares a bounded slow-search quota and deferred monsters get priority at the next update',()=>{
 const s=fixture(),h=s.game.hunt,count=PURSUIT_SEARCHES_PER_TICK+3,mobs=Array.from({length:count},(_,i)=>enemy(s,i));
 withWalls(s,[{x:.45,y:0,w:.1,h:1}],()=>{
  pursuePlayer(h,NOW+1000);const waiting=mobs.filter(m=>!m.pursuit);assert.equal(waiting.length,3);assert.ok(waiting.every(m=>m.x===.2&&m.y===.2));
  h.field.x=.81;pursuePlayer(h,NOW+2000);assert.ok(waiting.every(m=>m.pursuit?.x===.81));assert.ok(waiting.every(m=>m.x!==.2||m.y!==.2));
  const priority=h.field.pursuitCursor;assert.ok(priority);h.field.mobs.reverse();h.field.x=.82;pursuePlayer(h,NOW+3000);
  assert.equal(mobs.find(m=>m.instanceId===priority).pursuit?.x,.82,'priority follows the actor ID when ownership ordering changes');
 });
 const room={id:'a',col:0,row:0,walls:[]},work={remaining:0,deferred:false};
 assert.ok(planSurfaceApproach({x:.1,y:.2,walls:[]},{x:.8,y:.2},.2,{rooms:[room]},room,work));assert.equal(work.remaining,0);assert.equal(work.deferred,false,'direct pursuit does not spend a search token');
});

test('root and lost aggression clear stale routes and an offline pause grants no more than the previous five-second movement cap',()=>{
 const s=fixture(),h=s.game.hunt,m=enemy(s);m.l2Effects=[{l2SkillId:1201,level:10,until:NOW+2000}];
 pursuePlayer(h,NOW+1000);assert.equal(m.x,.2);assert.equal(m.pursuit,undefined);pursuePlayer(h,NOW+2000);assert.ok(m.x>.2&&m.x<=.29+1e-9);
 m.aggro=false;pursuePlayer(h,NOW+3000);assert.equal(m.pursuit,undefined);assert.deepEqual(m.path,[]);
 Object.assign(h.field,{x:.95,y:.9});Object.assign(m,{x:.1,y:.1,aggro:true,lastMoveAt:NOW+3000});const before={x:m.x,y:m.y};pursuePlayer(h,NOW+600000);assert.ok(Math.hypot(m.x-before.x,m.y-before.y)<=.45+1e-9);
});

test('blocked pursuit does not deal damage until line of sight opens',()=>{
 const s=fixture(),h=s.game.hunt,m=enemy(s);Object.assign(h.field,{x:.55,y:.5});Object.assign(m,{x:.45,y:.5,nextAttackAt:NOW+500,nextAbilityAt:NOW+1e12});const hp=s.game.gameClass.stats.hp;
 withWalls(s,[{x:.49,y:.4,w:.02,h:.2}],()=>{h.field.seenAt=NOW+500;advanceHunt(s,NOW+500,()=>.99);assert.equal(s.game.gameClass.stats.hp,hp);});
});
test('leaving and reactivating a resident bank discard saved pursuit and refresh clocks',()=>{
 const s=fixture(),h=s.game.hunt,f=h.field,m=enemy(s),outside={...m,instanceId:'outside',pursuit:{blocked:true},path:[{x:.3,y:.2}]};
 f.rooms.r2c3={mobs:[outside]};f.residentRooms.push('r2c3');ensureHunt(s,NOW+1000,()=>.5);
 assert.equal(outside.aggro,false);assert.equal(outside.pursuit,undefined);assert.deepEqual(outside.path,[]);
 const returning=f.rooms.r0c1.mobs[0];returning.pursuit={blocked:true};returning.path=[{x:.2,y:.3}];returning.nextAttackAt=NOW-1;f.residentRooms=f.residentRooms.filter(id=>id!=='r0c1');
 ensureHunt(s,NOW+2000,()=>.5);assert.equal(returning.pursuit,undefined);assert.deepEqual(returning.path,[]);assert.ok(returning.nextAttackAt>=NOW+2000+returning.attackMs);
});
