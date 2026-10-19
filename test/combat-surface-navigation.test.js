import test from 'node:test';
import assert from 'node:assert/strict';
import {planSurfaceApproach} from '../functions/game/world/surfaceNavigation.js';
import {enterHuntField,ensureHunt,advanceHunt,setHuntAttack,useHuntSkill,selectHuntTarget,moveHuntField} from '../functions/game/hunt/huntFight.js';
import {actorEntries,battleActor,battleWalls} from '../functions/game/hunt/huntNeighborhood.js';
import {roomLayout} from '../functions/game/hunt/huntRooms.js';
import {getZone} from '../functions/game/hunt/huntMobs.js';
import {skillSpatial,inSkillReach,clearLine} from '../functions/game/hunt/huntSpatial.js';
import {ROOM_SIZE} from '../functions/game/world/navigation.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import getSpeed from '../functions/game/player/getters/getSpeed.js';
const NOW=1800000000000;
function fixture(name='humanFighter'){
 const s={userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:85,currentExp:0},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(s,name);updateStats(s);enterHuntField(s,'cruma-marshlands',{now:NOW,random:()=>.5});s.game.world={mode:'location',location:'cruma-marshlands'};ensureHunt(s,NOW,()=>.5);quiet(s);return s;
}
function quiet(s){for(const {mob} of actorEntries(s.game.hunt))Object.assign(mob,{aggressive:false,aggro:false,aggroRange:0,nextAttackAt:NOW+1e12});}
function tick(s,at){quiet(s);s.game.hunt.field.seenAt=at;return advanceHunt(s,at,()=>.5);}
function walls(s,value,fn){const f=s.game.hunt.field,room=roomLayout(getZone(s.game.hunt.zone)).rooms.find(r=>r.id===f.room),old=room.walls;try{room.walls=value;f.walls=value;return fn();}finally{room.walls=old;}}
function endPoint(plan,room,layout){const last=plan.crossing?.route.at(-1);const landing=last?layout.rooms.find(r=>r.id===last.room):room,p=last?last.path.at(-1):plan.path.at(-1);return {x:p.x+landing.col-room.col,y:p.y+landing.row-room.row};}

test('a melee firing point can lie between grid centres when the direct side is blocked',()=>{
 const room={id:'a',row:0,col:0,walls:[{x:.45,y:.47,w:.045,h:.06}]},layout={rooms:[room]},target={x:.5,y:.5},range=.017;
 const plan=planSurfaceApproach({x:.2,y:.5,walls:room.walls},target,range,layout,room);assert.ok(plan);
 const end=endPoint(plan,room,layout);assert.ok(Math.hypot(end.x-target.x,end.y-target.y)<=range+1e-10);assert.ok(clearLine(end,target,room.walls));
 for(const invalid of [0,-1,Infinity,NaN])assert.equal(planSurfaceApproach({x:.2,y:.5},target,invalid,layout,room),null);
});

test('melee autoattack follows a saved neighbour detour and kills only its original target once',()=>{
 let s=fixture(),f=s.game.hunt.field;Object.assign(f,{x:.2,y:.2});const m=f.mobs[0];Object.assign(m,{x:.8,y:.2,currentHp:1});
 walls(s,[{x:.45,y:0,w:.1,h:1}],()=>{
  assert.ok(selectHuntTarget(s,m.instanceId,NOW).ok);assert.ok(setHuntAttack(s,true,NOW).ok);assert.ok(f.crossing?.combat);assert.ok(f.crossing.route.length>=2);assert.equal(s.game.hunt.kills,0);
  s=JSON.parse(JSON.stringify(s));f=s.game.hunt.field;
  for(let at=NOW+500;at<=NOW+90000&&s.game.hunt.kills===0;at+=500)tick(s,at);
  assert.equal(s.game.hunt.kills,1);assert.equal(f.room,'r0c0');assert.ok(f.visited.some(id=>id!=='r0c0'));assert.equal(battleActor(s.game.hunt,m.instanceId),null);assert.equal(f.autoAttack,undefined);
  const paid=JSON.stringify(s.game.inventory);tick(s,NOW+90500);assert.equal(s.game.hunt.kills,1);assert.equal(JSON.stringify(s.game.inventory),paid);
 });
});

test('a ranged skill chooses a reachable firing side and spends resources only after reaching and casting',()=>{
 const s=fixture('mage'),f=s.game.hunt.field,m=f.mobs[0];Object.assign(f,{x:.2,y:.2});Object.assign(m,{x:.8,y:.2,currentHp:1});const mp=s.game.gameClass.stats.mp;
 walls(s,[{x:.45,y:0,w:.1,h:1}],()=>{
  selectHuntTarget(s,m.instanceId,NOW);assert.ok(useHuntSkill(s,0,{now:NOW,random:()=>.5}).ok);assert.ok(f.action?.approach);assert.equal(s.game.gameClass.stats.mp,mp);assert.equal(m.currentHp,1);
  let sawCast=false;
  for(let at=NOW+500;at<=NOW+90000&&s.game.hunt.kills===0;at+=500){
   tick(s,at);if(f.action?.phase==='cast'){sawCast=true;assert.equal(s.game.gameClass.stats.mp,mp);assert.ok(inSkillReach({...f,walls:battleWalls(s.game.hunt)},battleActor(s.game.hunt,m.instanceId),skillSpatial(s,s.game.gameClass.skills[0],at)));}
  }
  assert.ok(sawCast);assert.equal(s.game.hunt.kills,1);assert.ok(s.game.gameClass.stats.mp<mp);assert.equal(f.action,undefined);
 });
});

test('a diagonal combat route retains its intention across every cardinal transfer',()=>{
 const s=fixture(),f=s.game.hunt.field,m=f.rooms.r1c1.mobs[0];Object.assign(f,{x:.8,y:.8});Object.assign(m,{x:.25,y:.25,currentHp:1});
 selectHuntTarget(s,m.instanceId,NOW);setHuntAttack(s,true,NOW);assert.ok(f.crossing?.combat);assert.ok(f.crossing.route.length>=2);
 let transferred=false;
 for(let at=NOW+250;at<=NOW+30000&&s.game.hunt.kills===0;at+=250){tick(s,at);if(f.room!=='r0c0'&&f.room!=='r1c1'){transferred=true;assert.equal(f.autoAttack?.targetId,m.instanceId);assert.equal(f.crossing?.combat,true);}}
 assert.ok(transferred);assert.equal(f.room,'r1c1');assert.equal(s.game.hunt.kills,1);
});

test('target movement replans before walking and retains the elapsed distance budget',()=>{
 const s=fixture(),f=s.game.hunt.field,m=f.rooms.r0c1.mobs[0];Object.assign(f,{x:.2,y:.6});Object.assign(m,{x:.4,y:.6});selectHuntTarget(s,m.instanceId,NOW);setHuntAttack(s,true,NOW);
 const start={x:f.x,y:f.y},speed=getSpeed(s),cached=f.path;tick(s,NOW+250);assert.equal(f.path,cached,'stationary targets retain the cached path');
 m.y=.8;tick(s,NOW+500);const distance=Math.hypot(f.x-start.x,f.y-start.y);
 assert.ok(distance>0,'a moving target must not reset every tick to zero movement');assert.ok(distance<=speed*.5/ROOM_SIZE+1e-9);assert.equal(f.autoAttack.approach.y,.8);
 const path=f.path;m.y=.7;tick(s,NOW+1000);assert.notEqual(f.path,path);assert.equal(f.autoAttack.approach.y,.7);assert.equal(f.autoAttack.targetId,m.instanceId);
});

test('an unreachable or vanished target cancels the route without charging or hitting another NPC',()=>{
 const s=fixture('mage'),f=s.game.hunt.field,m=f.mobs[0];Object.assign(f,{x:.2,y:.2});Object.assign(m,{x:.8,y:.2});const mp=s.game.gameClass.stats.mp,hp=m.currentHp;
 walls(s,[{x:.7,y:0,w:.01,h:1},{x:.9,y:0,w:.01,h:1},{x:.7,y:.1,w:.21,h:.01},{x:.7,y:.3,w:.21,h:.01}],()=>{
  selectHuntTarget(s,m.instanceId,NOW);useHuntSkill(s,0,{now:NOW,random:()=>.5});assert.equal(f.action,undefined);assert.equal(f.crossing,undefined);assert.equal(s.game.gameClass.stats.mp,mp);assert.equal(m.currentHp,hp);
 });
 const other=fixture(),of=other.game.hunt.field,target=of.rooms.r1c1.mobs[0];Object.assign(of,{x:.8,y:.8});Object.assign(target,{x:.3,y:.3});selectHuntTarget(other,target.instanceId,NOW);setHuntAttack(other,true,NOW);
 const allHp=actorEntries(other.game.hunt).filter(r=>r.mob!==target).map(r=>r.mob.currentHp),start={x:of.x,y:of.y};target.currentHp=0;tick(other,NOW+500);
 assert.equal(of.autoAttack,undefined);assert.equal(of.crossing,undefined);assert.deepEqual({x:of.x,y:of.y},start);assert.deepEqual(actorEntries(other.game.hunt).filter(r=>r.mob!==target).map(r=>r.mob.currentHp),allHp);
});

test('manual walking cancels every queued combat leg and no attack resumes after the detour',()=>{
 const s=fixture(),f=s.game.hunt.field,m=f.rooms.r1c1.mobs[0];Object.assign(f,{x:.8,y:.8});Object.assign(m,{x:.25,y:.25,currentHp:1});selectHuntTarget(s,m.instanceId,NOW);setHuntAttack(s,true,NOW);
 assert.ok(f.autoAttack?.approach);assert.ok(moveHuntField(s,{x:.7,y:.7},NOW).ok);assert.equal(f.autoAttack,undefined);assert.equal(f.crossing,undefined);tick(s,NOW+2000);assert.equal(s.game.hunt.kills,0);assert.equal(m.currentHp,1);
});
