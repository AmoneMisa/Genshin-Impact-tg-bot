import test from 'node:test';
import assert from 'node:assert/strict';
import {worldAction,worldState,advanceWorld} from '../functions/game/world/world.js';
import {nativeRoute} from '../functions/game/world/nativeTravel.js';
import {nativeSegment} from '../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
import {createNativeJourney,advanceNativeJourney,nativeJourneyDto} from '../functions/game/world/nativeJourney.js';
import {getHuntState} from '../miniapp/hunt.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
import routes from '../template/nativeRoutes.js';
const NOW=1800000000000;
function hero(){
 const s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:'aden',x:.5,y:.5,path:[],moveAt:NOW,locks:{}}}};
 change(s,'humanFighter');update(s);return s;
}
function quiet(field){for(const m of [field,...Object.values(field.rooms||{})].flatMap(r=>r.mobs||[]))Object.assign(m,{aggressive:false,aggro:false,aggroRange:0,nextAttackAt:NOW+1e12});}
function finish(s,now){const trip=s.game.world.walkHome;assert.ok(trip.native);advanceWorld(s,now);assert.equal(s.game.world.walkHome,undefined);}
test('all published native city and return links verify every original cell in both directions',()=>{
 const available=Object.values(routes.routes).filter(r=>r.available);assert.equal(available.length,7);
 for(const route of available){
  let point=route.from;
  for(const next of route.path){assert.ok(nativeSegment(point,next,{allowed:nativeGroundAllowed,reversible:true}));point=next;}
  assert.deepEqual(point,route.to);
  for(const next of route.returnPath){assert.ok(nativeSegment(point,next,{allowed:nativeGroundAllowed}));point=next;}
  assert.deepEqual(point,route.from);
 }
});
test('one distance budget crosses native region boundaries identically before and after save/load',()=>{
 const route=nativeRoute('forsaken-plains'),a=createNativeJourney(route.from,route.path,{now:NOW,speed:100}),b=JSON.parse(JSON.stringify(a));
 const duration=Math.ceil(route.distance/100*1000*.57);
 advanceNativeJourney(a,NOW+duration,100);
 for(let ms=1000;ms<duration;ms+=1000)advanceNativeJourney(b,NOW+ms,100);
 advanceNativeJourney(b,NOW+duration,100);
 assert.equal(a.native.index,b.native.index);
 assert.ok(Math.hypot(a.native.point.x-b.native.point.x,a.native.point.y-b.native.point.y)<1e-7);
 assert.equal(a.native.point.z,b.native.point.z);assert.ok(!a.native.blocked&&!b.native.blocked);
 assert.ok(Math.abs(a.native.remaining-b.native.remaining)<1e-7);
 const paused=JSON.parse(JSON.stringify(a)),point={...paused.native.point};advanceNativeJourney(paused,NOW+duration+60000,0);
 assert.deepEqual(paused.native.point,point);assert.equal(paused.until,null);
 advanceNativeJourney(paused,NOW+duration+61000,100);
 assert.ok(Math.abs(a.native.remaining-paused.native.remaining-100)<1e-6,'paused time does not become free movement');
});
test('native walking is server-owned, conserves money and hides full route/banks from both DTOs',async()=>{
 const s=hero(),gold=s.game.inventory.gold;
 assert.ok(worldAction(s,{action:'walk_location',location:'forsaken-plains',point:{x:0,y:0,z:1e9},floor:99,room:'wrong'},NOW).ok);
 const field=worldState(s,NOW+1000);assert.equal(field.player.mode,'road');assert.ok(field.player.worldPoint);
 assert.ok(field.player.worldPath.length<=16);assert.equal(field.player.walkHome.native,undefined);
 assert.equal((await getHuntState(s,NOW+1000)).world.walkHome.native,undefined);
 assert.equal(s.game.world.city,'aden');assert.equal(s.game.inventory.gold,gold);
 assert.ok(s.game.world.walkHome.native.path.length>1);
 assert.equal(worldAction(s,{action:'native_move',point:{x:1e9,y:1e9,z:-100}},NOW+1000).ok,false);
 assert.equal(s.game.world.walkHome.location,'forsaken-plains');
 finish(s,NOW+1000000);assert.equal(s.game.world.location,'forsaken-plains');assert.equal(s.game.inventory.gold,gold);
});
test('hunting areas join through their source town hub and retain HP, IDs, visits and respawns on return',async()=>{
 let s=hero();assert.ok(worldAction(s,{action:'walk_location',location:'forsaken-plains'},NOW).ok);finish(s,NOW+1000000);
 await getHuntState(s,NOW+1000000);let field=s.game.hunt.field;quiet(field);
 const mob=[field,...Object.values(field.rooms)].flatMap(r=>r.mobs||[])[0];assert.ok(mob);mob.currentHp=1;
 const id=mob.instanceId,visits=[...field.visited];field.respawns.push({room:field.room,sourceSlot:999999,at:NOW+1e10});
 assert.ok(worldAction(s,{action:'walk_location',location:'silent-valley'},NOW+1000000).ok);
 assert.equal(s.game.hunt.field,null);assert.ok(s.game.world.nativeFields['forsaken-plains']);
 s=JSON.parse(JSON.stringify(s));finish(s,NOW+3000000);assert.equal(s.game.world.location,'silent-valley');
 await getHuntState(s,NOW+3000000);quiet(s.game.hunt.field);
 assert.ok(worldAction(s,{action:'walk_location',location:'forsaken-plains'},NOW+3000000).ok);finish(s,NOW+5000000);
 field=s.game.hunt.field;quiet(field);
 const returned=[field,...Object.values(field.rooms)].flatMap(r=>r.mobs||[]).find(m=>m.instanceId===id);
 assert.equal(returned.currentHp,1);assert.deepEqual(field.visited,visits);assert.ok(field.respawns.some(r=>r.sourceSlot===999999));
 assert.equal(s.game.hunt.kills,0);assert.equal(JSON.stringify(worldState(s,NOW+5000000)).includes('nativeFields'),false);
});
test('native departure still requires the actual entrance, no aggro, the right region and existing access rules',async()=>{
 const s=hero();assert.equal(worldAction(s,{action:'walk_location',location:'devils-isle'},NOW).ok,false);
 assert.ok(worldAction(s,{action:'walk_location',location:'forsaken-plains'},NOW).ok);finish(s,NOW+1000000);
 await getHuntState(s,NOW+1000000);const f=s.game.hunt.field;quiet(f);Object.assign(f,{x:.2,y:.2});
 assert.equal(worldAction(s,{action:'walk_location',location:'silent-valley'},NOW+1000000).reason,'entrance_required');
 Object.assign(f,{x:.5,y:.95});
 assert.equal(worldAction(s,{action:'walk_location',location:'den-of-evil'},NOW+1000000).reason,'location_path_required');
 const mob=f.mobs[0]||Object.values(f.rooms).flatMap(r=>r.mobs)[0];
 f.mobs.push({...mob,instanceId:'combat-test',x:.5,y:.95,aggro:true,aggressive:true,aggroRange:10000,nextAttackAt:NOW+1e12});
 assert.equal(worldAction(s,{action:'walk_location',location:'silent-valley'},NOW+1000000).reason,'quick_travel_combat');
});
test('stopping a native walk keeps its real world point; a new click ignores client height and floor',()=>{
 const s=hero();assert.ok(worldAction(s,{action:'walk_location',location:'forsaken-plains'},NOW).ok);advanceWorld(s,NOW+5000);
 const point={...s.game.world.walkHome.native.point};assert.ok(worldAction(s,{action:'native_stop'},NOW+5000).ok);
 assert.deepEqual(s.game.world.nativePosition,point);assert.equal(s.game.world.mode,'native');
 assert.ok(worldAction(s,{action:'native_move',point:{x:point.x,y:point.y+32,z:1e9,floor:999,zone:'pagan-temple'}},NOW+5000).ok);
 assert.equal(s.game.world.walkHome.location,null);assert.notEqual(s.game.world.walkHome.native.path.at(-1).z,1e9);
 finish(s,NOW+6000);assert.equal(s.game.world.mode,'native');assert.equal(s.game.world.location,null);
});
