import test from 'node:test';import assert from 'node:assert/strict';
import route from '../template/paganChurchRoute.js';import rules from '../template/nativeFallRules.js';import access from '../template/paganAccess.js';
import {worldGeodata,geoCell} from '../functions/game/world/l2jGeodata.js';
import {nativeSegment} from '../functions/game/world/nativeNavigation.js';
import {nativeFallEdge} from '../functions/game/world/nativeFalling.js';
import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
import {nativeFallDamage,scheduleNativeFallDamage,advanceNativeFallDamage} from '../functions/game/world/nativeFallDamage.js';
import {nativePassiveStat} from '../functions/game/player/passiveSkills.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import {worldAction,advanceWorld,worldState,CITIES,CITY_NPCS,cityPoint} from '../functions/game/world/world.js';
import {nativeActorPoint,nativeFieldBuckets} from '../functions/game/world/nativeFieldSpace.js';
import {nativeLevelOptions} from '../functions/game/world/nativeLevelTravel.js';
import {nativeFloorGuides} from '../functions/game/world/nativeFloorTransports.js';
import change from '../functions/game/player/changePlayerGameClass.js';import update from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000,zone='pagan-temple';
function hero(name='humanFighter'){
 const s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1e6,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:'rune',x:.5,y:.5,path:[],moveAt:NOW,locks:{}}}};
 change(s,name);update(s);return s;
}
const actors=s=>nativeFieldBuckets(s.game.hunt?.field).flatMap(b=>b.mobs||[]);
function quiet(s){for(const m of actors(s))Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:NOW+1e12});}
function church(s){const npc=CITY_NPCS.find(n=>n.service==='pagan-church');Object.assign(s.game.world,cityPoint(CITIES.find(c=>c.id==='rune'),npc),{z:npc.z});assert.ok(worldAction(s,{action:'pagan_church'},NOW).ok);return s;}
function finish(s,now){
 let ticks=0;
 while(s.game.world.mode==='road'||s.game.hunt?.field?.native?.journey||Number.isInteger(s.game.hunt?.field?.native?.churchPendingStage)){
  assert.ok(++ticks<1000,'bounded source route');now+=500;quiet(s);advanceWorld(s,now);quiet(s);
 }
 return now;
}
test('church descent uses real source layers, ordinary grounded sections and four explicit downward ledges',()=>{
 assert.equal(route.originalScriptJump,null);assert.equal(route.source.geodataCommit,worldGeodata.manifest.commit);
 assert.deepEqual(route.stages.filter(s=>s.kind==='fall').map(s=>s.height),[344,400,392,336]);
 let previous=route.root,explicit=0;
 for(const stage of route.stages){
  assert.deepEqual(stage.from,previous);
  for(const p of [stage.from,stage.to,...stage.path||[]])assert.ok(worldGeodata.layers(geoCell(p.x),geoCell(p.y)).some(l=>l.z===p.z&&l.nswe),'stored original height '+JSON.stringify(p));
  if(stage.kind==='walk'){
   let point=stage.from;for(const p of stage.path){assert.ok(nativeSegment(point,p,{allowed:nativeGroundAllowed,reversible:true}));point=p;}
   assert.deepEqual(point,stage.to);
  }else{
   assert.ok(nativeFallEdge(stage.from,stage.to,{allowed:nativeGroundAllowed}));assert.equal(nativeFallEdge(stage.to,stage.from,{allowed:nativeGroundAllowed}),false);
   assert.equal(stage.originalScriptPoint,null);if(!nativeSegment(stage.from,stage.to,{allowed:nativeGroundAllowed}))explicit++;
   const all=worldGeodata.layers(geoCell(stage.to.x),geoCell(stage.to.y));assert.equal(Math.max(...all.filter(l=>l.z<stage.from.z).map(l=>l.z)),stage.to.z);
  }
  previous=stage.to;
 }
 assert.ok(explicit>0,'the ordinary grounded walker must keep rejecting a nearer ceiling');assert.deepEqual(previous,route.mirror);
 assert.deepEqual(worldGeodata.layers(NaN,0),[]);assert.deepEqual(worldGeodata.layers(.5,0),[]);
});
test('source fall damage is delayed, bounded by current HP minus one, and does not scale SP or inventory',()=>{
 const s=hero(),hp=s.game.gameClass.stats.hp,gold=s.game.inventory.gold;
 assert.equal(rules.damageDelayMs,1500);assert.equal(rules.validationDelayMs,1000);
 assert.equal(nativeFallDamage(s,250,NOW),0);const amount=Math.trunc(344*getMaxHp(s)/1000);assert.equal(nativeFallDamage(s,344,NOW),amount);
 scheduleNativeFallDamage(s,344,NOW);s.game=JSON.parse(JSON.stringify(s.game));advanceNativeFallDamage(s,NOW+1499);assert.equal(s.game.gameClass.stats.hp,hp);
 s.game.gameClass.stats.hp=10;advanceNativeFallDamage(s,NOW+1500);assert.equal(s.game.gameClass.stats.hp,1);
 advanceNativeFallDamage(s,NOW+10000);assert.equal(s.game.gameClass.stats.hp,1);assert.equal(s.game.inventory.gold,gold);assert.equal(s.game.inventory.sp,undefined);
});
test('Acrobatics applies the original flat FALL subtraction only in its learned class chain',()=>{
 const s=hero('rogueProf');s.game.l2Passives={173:2};
 assert.equal(nativePassiveStat(s,'fall'),-100);assert.equal(nativeFallDamage(s,400,NOW),Math.max(0,Math.trunc(400*getMaxHp(s)/1000-100)));
 change(s,'humanFighter');update(s);assert.equal(nativePassiveStat(s,'fall'),0);
});

test('a repeated fall keeps the first positive amount and restarts the source delayed task after validation',()=>{
 const s=hero(),hp=s.game.gameClass.stats.hp;
 scheduleNativeFallDamage(s,344,NOW);const amount=s.game.world.fallDamage.amount;
 scheduleNativeFallDamage(s,400,NOW+999);assert.equal(s.game.world.fallDamage.at,NOW+1500);
 scheduleNativeFallDamage(s,400,NOW+1000);assert.equal(s.game.world.fallDamage.amount,amount);assert.equal(s.game.world.fallDamage.at,NOW+2500);
 advanceNativeFallDamage(s,NOW+1500);assert.equal(s.game.gameClass.stats.hp,hp);
 advanceNativeFallDamage(s,NOW+2500);assert.equal(s.game.gameClass.stats.hp,Math.max(1,hp-amount));
});
test('native church, source ledges, both mirrors and the Rune walking return retain one underground bank',()=>{
 let s=hero(),now=NOW;assert.ok(worldAction(s,{action:'walk_location',location:zone},now).ok);now=finish(s,now);
 assert.equal(s.game.world.mode,'location');assert.equal(s.game.hunt.field.native.sourceFloor,3);assert.equal(worldState(s,now).nativeField.ground.asset,'/art/world/native/pagan-temple-floor-3.svg');
 assert.deepEqual(nativeLevelOptions(s.game.hunt).filter(r=>r.enabled).map(r=>r.floor),[4]);
 assert.equal(worldAction(s,{action:'native_floor',floor:1},now).ok,false,'no forged walk from Rune to the remote interior coordinates');
 assert.ok(worldAction(s,{action:'native_floor',floor:4},now).ok);s.game=JSON.parse(JSON.stringify(s.game));now=finish(s,now);
 assert.equal(s.game.hunt.field.native.sourceFloor,4);assert.deepEqual(nativeActorPoint(s.game.hunt.field),route.mirror);
 assert.equal(s.game.world.mode,'location');assert.equal(worldState(s,now).nativeField.ground.asset,'/art/world/native/pagan-temple-floor-4.svg');assert.ok(s.game.gameClass.stats.hp>=1);assert.ok(s.game.world.lastFall);
 assert.ok(nativeFloorGuides(s.game.hunt).find(g=>g.npcId===32039).near);assert.equal(worldAction(s,{action:'native_walk_city',city:'rune'},now).reason,'npc_floor_exit_required');
 assert.ok(worldAction(s,{action:'native_floor',floor:1,routeId:'32039:SCRIPT:0'},now).ok);advanceWorld(s,now);quiet(s);
 assert.deepEqual(nativeActorPoint(s.game.hunt.field),access.mirrors[32039].to);const mob=actors(s)[0];assert.ok(mob);mob.currentHp=2;const saved=mob.instanceId;
 assert.ok(worldAction(s,{action:'native_guide',npcId:32040},now).ok);now=finish(s,now);
 assert.ok(worldAction(s,{action:'native_floor',floor:3,routeId:'32040:SCRIPT:0'},now).ok);assert.equal(s.game.hunt.field.native.sourceFloor,3);assert.deepEqual(nativeActorPoint(s.game.hunt.field),access.mirrors[32040].to);
 assert.ok(worldAction(s,{action:'native_walk_city',city:'rune'},now).ok);now=finish(s,now);assert.equal(s.game.world.mode,'city');assert.ok(s.game.world.nativeFields[zone]);
 assert.ok(worldAction(s,{action:'walk_location',location:zone},now).ok);now=finish(s,now);assert.equal(s.game.hunt.field.native.sourceFloor,3);
 assert.ok(worldAction(s,{action:'native_floor',floor:4},now).ok);now=finish(s,now);assert.ok(worldAction(s,{action:'native_floor',floor:1,routeId:'32039:SCRIPT:0'},now).ok);
 const copies=actors(s).filter(m=>m.instanceId===saved);assert.equal(copies.length,1);assert.equal(copies[0].currentHp,2);assert.equal(s.game.inventory.gold,1e6);
});
test('stopping on an intermediate stored ledge cancels automatic descent; the native option resumes from that layer',()=>{
 const s=church(hero());let now=NOW;
 assert.ok(worldAction(s,{action:'native_floor',floor:4},now).ok);
 for(let tick=0;tick<200&&s.game.hunt.field.native.sourceFloor!==4;tick++){now+=500;advanceWorld(s,now);}
 assert.equal(s.game.hunt.field.native.sourceFloor,4);assert.ok(s.game.hunt.field.native.journey);
 assert.ok(worldAction(s,{action:'native_stop'},now).ok);const point=nativeActorPoint(s.game.hunt.field);advanceWorld(s,now+3000);assert.deepEqual(nativeActorPoint(s.game.hunt.field),point);
 assert.ok(nativeLevelOptions(s.game.hunt).some(r=>r.floor===4&&r.enabled));assert.ok(worldAction(s,{action:'native_floor',floor:4},now+3001).ok);now=finish(s,now+3001);
 assert.deepEqual(nativeActorPoint(s.game.hunt.field),route.mirror);assert.ok(s.game.gameClass.stats.hp>=1);
});
