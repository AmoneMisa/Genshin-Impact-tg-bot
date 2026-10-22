import test from 'node:test';
import assert from 'node:assert/strict';
import {worldAction,advanceWorld,worldState} from '../functions/game/world/world.js';
import {nativeFieldBuckets} from '../functions/game/world/nativeFieldSpace.js';
import routes from '../template/nativeRoutes.js';
import policy from '../template/nativeFieldPilot.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
const START=1800000000000;
const actors=s=>nativeFieldBuckets(s.game.hunt?.field).flatMap(b=>b.mobs||[]);
const quiet=(s,now)=>{for(const m of actors(s))Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:now+1e9});};
for(const [first,second] of [['cruma-marshlands','plains-of-dion'],['brekas-stronghold','dragon-valley'],['hot-springs','wall-of-argos']])test(`${first} -> ${second}: walking between native territories preserves the original field bank`,()=>{
 let s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1e6,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:policy.fields[first].city,x:.5,y:.5,path:[],moveAt:START,locks:{}}}};
 change(s,'humanFighter');update(s);let now=START;
 const go=id=>{
  quiet(s,now);const result=worldAction(s,{action:'walk_location',location:id},now);assert.equal(result.ok,true,JSON.stringify(result));
  const trip=s.game.world.walkHome,from=now,end=trip.until+1;
  for(let n=1;n<=20;n++){now=from+Math.floor((end-from)*n/20);advanceWorld(s,now);quiet(s,now);if(n===10)s=JSON.parse(JSON.stringify(s));}
  assert.equal(s.game.world.mode,'location');assert.equal(s.game.hunt.zone,id);assert.deepEqual(worldState(s,now).nativeField.point,routes.routes[id].to);now++;
 };
 go(first);const victim=actors(s)[0];assert.ok(victim);victim.currentHp=Math.floor(victim.hp*.4);const saved={id:victim.instanceId,hp:victim.currentHp,point:{...victim.sourcePosition}};
 go(second);assert.ok(actors(s).every(m=>policy.fields[second].npcIds.includes(m.mobId)));
 go(first);const copies=actors(s).filter(m=>m.instanceId===saved.id);assert.equal(copies.length,1);assert.equal(copies[0].currentHp,saved.hp);assert.deepEqual(copies[0].sourcePosition,saved.point);assert.equal(s.game.inventory.gold,1e6);
});
