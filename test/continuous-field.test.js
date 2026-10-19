import test from 'node:test';
import assert from 'node:assert/strict';
import {FIELD_POPULATIONS} from '../template/fieldPopulations.js';
import {continuousField,fieldStream,planFieldCrossing} from '../functions/game/world/continuousField.js';
import {roomLayout} from '../functions/game/hunt/huntRooms.js';
import {getZone} from '../functions/game/hunt/huntMobs.js';
import {enterHuntField,advanceHunt,moveHuntField,stopHuntAction,selectHuntTarget} from '../functions/game/hunt/huntFight.js';
import {getHuntState} from '../miniapp/hunt.js';
import {findPath,travelPath,ROOM_SIZE} from '../functions/game/world/navigation.js';
import getSpeed from '../functions/game/player/getters/getSpeed.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000;
function hero(zone='cruma-marshlands'){
 const s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(s,'humanFighter');updateStats(s);assert.ok(enterHuntField(s,zone,{now:NOW,random:()=>.5}).ok);
 s.game.world={mode:'location',location:zone};Object.assign(s.game.hunt.field,{x:.9,y:.6});quiet(s);return s;
}
function quiet(s){s.game.hunt.field.mobs.forEach(m=>{m.aggressive=false;m.aggroRange=0;m.aggro=false;m.nextAttackAt=NOW+1e12;});}
const distance=(from,path)=>{let n=0,p=from;for(const q of path){n+=Math.hypot(p.x-q.x,p.y-q.y);p=q;}return n;};
test('surface terrain streams at most nine cells with persistent nearby actors and separate underground and instance spaces',async()=>{
 let count=0;
 for(const [id,model] of Object.entries(FIELD_POPULATIONS)){
  const zone=getZone(id),layout=roomLayout(zone),surface=model.source.coordinateSpace==='surface';
  assert.equal(continuousField(zone,layout),surface,id);
  if(!surface)continue;count++;
  for(const r of layout.rooms){const dto=fieldStream(zone,layout,r);assert.ok(dto.tiles.length<=9);assert.ok(dto.tiles.some(t=>t.dx===0&&t.dy===0));assert.ok(dto.tiles.every(t=>!('mobs'in t)&&!('spawns'in t)));}
 }
 assert.ok(count>20);
 for(const id of ['tower-of-insolence','ivory-tower','pagan-temple','catacomb-branded','dimensional-rift']){const z=getZone(id);if(z)assert.equal(continuousField(z,roomLayout(z)),false);}
 const s=hero(),f=s.game.hunt.field,before=JSON.stringify(f),dto=(await getHuntState(s,NOW)).field;
 assert.equal(dto.continuous.geometry,'adapted');assert.ok(Object.keys(f.rooms).length<=8);assert.equal(f.visited.length,1);
 assert.equal(JSON.parse(before).mobs.length,f.mobs.length);
 const residents=JSON.stringify(f.rooms);await getHuntState(s,NOW);assert.equal(JSON.stringify(f.rooms),residents,'polling keeps the same resident population');
});
test('border intersection preserves its transverse coordinate and rejects corners, distant cells and the outer perimeter',()=>{
 const layout=roomLayout(getZone('cruma-marshlands')),room=layout.rooms[0],from={x:.9,y:.6};
 const p=planFieldCrossing(from,{x:1.25,y:.6},layout,room);
 assert.equal(p.room,'r0c1');assert.deepEqual(p.exit,{x:1,y:.6});assert.deepEqual(p.entry,{x:0,y:.6});assert.deepEqual(p.destination,{x:.25,y:.6});
 for(const point of [{x:-.1,y:.5},{x:1.2,y:1.2},{x:2.2,y:.5},{x:Infinity,y:.4}])assert.equal(planFieldCrossing(from,point,layout,room),null);
});
test('crossing uses one walking budget, survives save/load and keeps existing actors and pending respawns',()=>{
 const s=hero(),f=s.game.hunt.field,damaged=f.mobs[0];damaged.currentHp=1;
 f.respawns=[{room:f.room,sourceSlot:999999,at:NOW+1000000}];
 assert.ok(moveHuntField(s,{x:1.25,y:.6},NOW).ok);assert.ok(f.crossing);assert.equal(f.room,'r0c0');
 const length=distance(f,f.path),speed=getSpeed(s),before=JSON.stringify(s.game.inventory),saved=JSON.parse(JSON.stringify(s));
 const arrives=NOW+Math.ceil((length+.03)*ROOM_SIZE/speed*1000);
 advanceHunt(saved,arrives,()=>.5);quiet(saved);const bank=saved.game.hunt.field;
 assert.equal(bank.room,'r0c1');assert.ok(bank.x<.05,'unused budget is carried rather than granting an entire second tick');
 assert.equal(bank.rooms.r0c0.mobs.find(m=>m.instanceId===damaged.instanceId).currentHp,1);assert.equal(bank.respawns.length,1);
 assert.equal(JSON.stringify(saved.game.inventory),before);assert.equal(saved.game.hunt.kills,0);
 advanceHunt(saved,arrives+20000,()=>.5);quiet(saved);
 assert.ok(moveHuntField(saved,{x:-.2,y:.6},arrives+20000).ok);advanceHunt(saved,arrives+60000,()=>.5);quiet(saved);
 assert.equal(bank.room,'r0c0');assert.equal(bank.mobs.find(m=>m.instanceId===damaged.instanceId).currentHp,1);
 assert.equal(bank.respawns.length,1);
});
test('invalid crossings cannot switch zone/floor, bypass walls or cross dungeon walls; selecting a target cancels walking',()=>{
 const s=hero(),f=s.game.hunt.field;
 for(const point of [{x:100,y:.6,zone:'hellbound',floor:11},{x:-.2,y:.6},{x:2.2,y:1.2}])assert.equal(moveHuntField(s,point,NOW).ok,false);
 assert.equal(s.game.hunt.zone,'cruma-marshlands');assert.equal(f.floor,1);assert.equal(f.room,'r0c0');
 const layout=roomLayout(getZone('cruma-marshlands')),next=layout.rooms.find(r=>r.id==='r0c1'),walls=next.walls;
 try{next.walls=[{x:0,y:0,w:1,h:1}];assert.equal(moveHuntField(s,{x:1.25,y:.6},NOW).reason,'path_blocked');}finally{next.walls=walls;}
 assert.ok(moveHuntField(s,{x:1.25,y:.6},NOW).ok);assert.ok(f.crossing);
 assert.ok(selectHuntTarget(s,f.mobs[0].instanceId,NOW).ok);assert.equal(f.crossing,undefined);assert.equal(f.path.length,0);
 const underground=hero('catacomb-branded');assert.equal(moveHuntField(underground,{x:1.25,y:.6},NOW).ok,false);
 assert.ok(moveHuntField(s,{x:1.25,y:.6},NOW).ok);stopHuntAction(f,NOW);advanceHunt(s,NOW+30000,()=>.5);assert.equal(f.room,'r0c0');
 assert.ok(moveHuntField(s,{x:1.25,y:.6},NOW+30000).ok);f.path=[];advanceHunt(s,NOW+30001,()=>.5);assert.equal(f.room,'r0c0','an interrupted path cannot become an instant border transfer');
});
test('path budget is conserved and only the explicit surface planner enables zero-margin boundaries',()=>{
 assert.equal(findPath({x:.9,y:.6},{x:1,y:.6}),null);
 const path=findPath({x:.9,y:.6},{x:1,y:.6},[],{margin:0});assert.ok(path);
 const actor={x:0,y:0,path:[{x:.3,y:0},{x:.3,y:.4}]};assert.ok(Math.abs(travelPath(actor,1)-.3)<1e-12);assert.deepEqual(actor.path,[]);
});
test('one large update and many small updates cover the same distance across a cell boundary',()=>{
 const a=hero(),b=hero();
 for(const s of [a,b])assert.ok(moveHuntField(s,{x:1.25,y:.6},NOW).ok);
 const speed=getSpeed(a),duration=Math.ceil((distance(a.game.hunt.field,a.game.hunt.field.path)+.1)*ROOM_SIZE/speed*1000);
 advanceHunt(a,NOW+duration,()=>.5);
 for(let elapsed=100;elapsed<duration;elapsed+=100)advanceHunt(b,NOW+elapsed,()=>.5);
 advanceHunt(b,NOW+duration,()=>.5);
 assert.equal(a.game.hunt.field.room,b.game.hunt.field.room);
 assert.ok(Math.hypot(a.game.hunt.field.x-b.game.hunt.field.x,a.game.hunt.field.y-b.game.hunt.field.y)<1e-10);
});
