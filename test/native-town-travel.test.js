import test from 'node:test';
import assert from 'node:assert/strict';
import compiled from '../template/nativeTownRoutes.js';
import {CITIES,worldAction,worldState,advanceWorld,ensureWorld,cityPoint} from '../functions/game/world/world.js';
import {nativeTownPath,nativeTownHub,nativeTownCities,nativeCityAt,nativeTownEdges} from '../functions/game/world/nativeTownGraph.js';
import {nativeSegment,findNativePath} from '../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
import {quickTravelDestinations} from '../webapp/quick-travel-menu.js';
import {movementHtml} from '../webapp/atlas-ui.js';
import {getHuntState} from '../miniapp/hunt.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000;
function hero(city='dion'){
 const s={userId:1,game:{stats:{lvl:85},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city,x:.5,y:.5,path:[],moveAt:NOW,locks:{}}}};
 change(s,'humanFighter');update(s);ensureWorld(s,NOW);return s;
}
function finish(s,now){assert.ok(s.game.world.walkHome?.native);advanceWorld(s,now);assert.equal(s.game.world.walkHome,undefined);}
function quiet(s){const f=s.game.hunt.field;for(const m of [f,...Object.values(f.rooms||{})].flatMap(r=>r.mobs||[]))Object.assign(m,{aggressive:false,aggro:false,aggroRange:0,nextAttackAt:NOW+1e12});}
test('published original town links verify every cell in both directions and graph joins preserve exact hub positions',()=>{
 assert.ok(nativeTownEdges().length>=8);
 for(const route of nativeTownEdges()){
  assert.deepEqual(route.from,nativeTownHub(route.fromCity));assert.deepEqual(route.to,nativeTownHub(route.toCity));
  let at=route.from;for(const next of route.path){assert.ok(nativeSegment(at,next,{allowed:nativeGroundAllowed,reversible:true}));at=next;}assert.deepEqual(at,route.to);
  for(const next of route.returnPath){assert.ok(nativeSegment(at,next,{allowed:nativeGroundAllowed}));at=next;}assert.deepEqual(at,route.from);
 }
 const path=nativeTownPath('dion','heine');assert.deepEqual(path.cities,['dion','giran','heine']);
 assert.equal(path.distance,compiled.routes['dion:giran'].distance+compiled.routes['giran:heine'].distance);
 let at=path.start;for(const next of path.path){assert.ok(nativeSegment(at,next,{allowed:nativeGroundAllowed,reversible:true}));at=next;}assert.deepEqual(at,nativeTownHub('heine'));
 assert.ok(nativeTownCities('dion').includes('aden'));assert.ok(nativeTownPath('gludio','dion'));assert.equal(nativeTownPath('dion','keucereus-alliance-base'),null);
});

test('Gludin joins the central mainland across the reverse-compiled Gludio to Dion road',()=>{
 let s=hero('gludin');const link=nativeTownPath('gludin','aden');
 assert.deepEqual(link.cities.slice(0,3),['gludin','gludio','dion']);assert.ok(link.path.length<512);
 assert.ok(worldAction(s,{action:'native_walk_city',city:'aden'},NOW).ok);
 const trip=s.game.world.walkHome,middle=NOW+Math.floor((trip.until-NOW)*.42);
 assert.ok(worldAction(s,{action:'native_stop'},middle).ok);const point={...s.game.world.nativePosition};s=JSON.parse(JSON.stringify(s));
 assert.ok(worldAction(s,{action:'native_walk_city',city:'aden'},middle+1).ok);assert.deepEqual(s.game.world.walkHome.native.point,point);
 finish(s,middle+1e7);assert.equal(s.game.world.city,'aden');assert.equal(s.game.inventory.gold,1000000);
 assert.ok(worldAction(s,{action:'native_walk_city',city:'gludin'},middle+1e7).ok);finish(s,middle+2e7);
 assert.equal(s.game.world.city,'gludin');assert.equal(s.game.inventory.gold,1000000);
});

test('Goddard and Rune share a verified road and the Beast Farm keeps its canonical bank across it',async()=>{
 let s=hero('goddard');assert.ok(worldState(s,NOW).nativeWalkCities.includes('rune'));
 assert.ok(worldAction(s,{action:'walk_location',location:'beast-farm'},NOW).ok);finish(s,NOW+1e7);await getHuntState(s,NOW+1e7);quiet(s);
 const f=s.game.hunt.field,mob=[f,...Object.values(f.rooms||{})].flatMap(r=>r.mobs||[])[0];mob.currentHp=2;const id=mob.instanceId;
 assert.ok(worldState(s,NOW+1e7).nativeWalkCities.includes('goddard'));
 assert.ok(worldAction(s,{action:'native_walk_city',city:'goddard'},NOW+1e7).ok);
 s=JSON.parse(JSON.stringify(s));finish(s,NOW+2e7);assert.equal(s.game.world.city,'goddard');assert.equal(s.game.world.mode,'city');
 assert.ok(worldAction(s,{action:'walk_location',location:'beast-farm'},NOW+2e7).ok);finish(s,NOW+3e7);
 const returned=s.game.hunt.field;
 assert.equal([returned,...Object.values(returned.rooms||{})].flatMap(r=>r.mobs||[]).find(m=>m.instanceId===id).currentHp,2);
 assert.equal(s.game.world.nativeFields['beast-farm'],undefined);assert.equal(s.game.inventory.gold,1000000);
});

test('the Floran city-marker walking action uses the same physical journey as the shared movement list',()=>{
 const a=hero('floran'),b=hero('floran');
 assert.ok(worldAction(a,{action:'travel_city',city:'dion'},NOW).ok);
 assert.ok(worldAction(b,{action:'native_walk_city',city:'dion'},NOW).ok);
 assert.deepEqual(a.game.world.walkHome,b.game.world.walkHome);assert.ok(a.game.world.walkHome.native);
 const middle=NOW+Math.floor((a.game.world.walkHome.until-NOW)/2);
 assert.ok(worldAction(a,{action:'native_stop'},middle).ok);const point={...a.game.world.nativePosition};
 assert.ok(worldAction(a,{action:'native_walk_city',city:'dion'},middle+1).ok);assert.deepEqual(a.game.world.walkHome.native.point,point);
 finish(a,middle+1e7);assert.equal(a.game.world.city,'dion');assert.equal(a.game.inventory.gold,1000000);
});
test('a city journey crosses intermediate towns without paying or teleporting and resumes from a saved physical stop',()=>{
 let s=hero(),gold=s.game.inventory.gold;
 const dto=worldState(s,NOW);assert.ok(dto.nativeWalkCities.includes('heine'));assert.ok(!dto.nativeWalkCities.includes('dion'));
 assert.ok(worldAction(s,{action:'native_walk_city',city:'heine'},NOW).ok);const trip=s.game.world.walkHome;
 const middle=NOW+Math.floor((trip.until-NOW)*.55);assert.ok(worldAction(s,{action:'native_stop'},middle).ok);
 const point={...s.game.world.nativePosition};s=JSON.parse(JSON.stringify(s));
 assert.ok(worldAction(s,{action:'native_walk_city',city:'heine'},middle+1).ok);assert.deepEqual(s.game.world.walkHome.native.point,point);
 finish(s,middle+1e7);assert.equal(s.game.world.mode,'city');assert.equal(s.game.world.city,'heine');assert.equal(s.game.inventory.gold,gold);
 const city=CITIES.find(c=>c.id==='heine'),hub=nativeTownHub('heine');assert.deepEqual({x:s.game.world.x,y:s.game.world.y},cityPoint(city,hub));assert.equal(s.game.world.z,hub.z);
 assert.equal(s.game.world.nativePosition,undefined);
});
test('different-region hunting rooms join through real town roads and preserve their one canonical NPC bank',async()=>{
 let s=hero('giran');assert.ok(worldAction(s,{action:'walk_location',location:'dragon-valley'},NOW).ok);finish(s,NOW+1e6);await getHuntState(s,NOW+1e6);quiet(s);
 const mob=s.game.hunt.field.mobs[0]||Object.values(s.game.hunt.field.rooms).flatMap(r=>r.mobs||[])[0];mob.currentHp=2;const id=mob.instanceId;
 assert.ok(worldState(s,NOW+1e6).nativeWalk['field-of-silence'].enabled);
 assert.ok(worldAction(s,{action:'walk_location',location:'field-of-silence'},NOW+1e6).ok);s=JSON.parse(JSON.stringify(s));finish(s,NOW+1e7);
 assert.equal(s.game.world.city,'heine');assert.equal(s.game.world.location,'field-of-silence');await getHuntState(s,NOW+1e7);quiet(s);
 assert.ok(worldAction(s,{action:'walk_location',location:'dragon-valley'},NOW+1e7).ok);finish(s,NOW+2e7);
 const f=s.game.hunt.field,returned=[f,...Object.values(f.rooms||{})].flatMap(r=>r.mobs||[]).find(m=>m.instanceId===id);
 assert.equal(returned.currentHp,2);assert.equal(s.game.world.nativeFields['dragon-valley'],undefined);assert.equal(s.game.inventory.gold,1000000);
});
test('a regular city click can leave its source boundary and walking back enters the city at the actual endpoint',()=>{
 const s=hero('dion'),city=CITIES.find(c=>c.id==='dion'),start={x:city.x+(s.game.world.x-.5)*14000,y:city.y+(s.game.world.y-.5)*14000,z:s.game.world.z};
 const route=compiled.routes['dion:floran'];
 const goal=route.path.find(p=>!nativeCityAt(p)&&Math.hypot(p.x-start.x,p.y-start.y)<8192&&findNativePath(start,p,{allowed:nativeGroundAllowed,maxNodes:6000,reversible:true}).ok);
 assert.ok(goal,'source road has a reachable point outside the town');
 assert.ok(worldAction(s,{action:'move',point:{...cityPoint(city,goal),z:1e9},floor:99},NOW).ok);assert.equal(s.game.world.mode,'road');assert.ok(s.game.world.walkHome.native);
 finish(s,NOW+1e6);assert.equal(s.game.world.mode,'native');assert.equal(s.game.world.nativePosition.z,goal.z);
 assert.ok(worldAction(s,{action:'native_move',point:{x:start.x,y:start.y,z:1e9,city:'giran'}},NOW+1e6).ok);finish(s,NOW+2e6);
 assert.equal(s.game.world.mode,'city');assert.equal(s.game.world.city,'dion');assert.ok(Math.hypot(city.x+(s.game.world.x-.5)*14000-start.x,city.y+(s.game.world.y-.5)*14000-start.y)<1e-6);assert.equal(s.game.world.z,start.z);
 assert.equal(nativeCityAt({...start,z:1e9}),null);
});
test('walking-only towns use the shared list and routes cannot bypass realm, entrance or distance checks',async()=>{
 const s=hero();const dto=worldState(s,NOW),row=quickTravelDestinations(dto,'cities').find(c=>c.id==='floran');
 assert.ok(row?.walkingOnly&&row.unavailable);assert.equal(row.gold,null);assert.match(movementHtml(dto,{selected:{kind:'city',id:'floran'}}),/data-quick-confirm disabled/);
 assert.equal(worldAction(s,{action:'native_walk_city',city:'keucereus-alliance-base'},NOW).ok,false);
 assert.equal(worldAction(s,{action:'native_move',point:{x:1e9,y:1e9,z:0}},NOW).ok,false);assert.equal(s.game.world.mode,'city');
 assert.ok(worldAction(s,{action:'walk_location',location:'dragon-valley'},NOW).ok);finish(s,NOW+1e7);await getHuntState(s,NOW+1e7);quiet(s);
 s.game.hunt.field.x=.2;s.game.hunt.field.y=.2;assert.deepEqual(worldState(s,NOW+1e7).nativeWalkCities,[]);
 assert.equal(worldAction(s,{action:'native_walk_city',city:'heine'},NOW+1e7).reason,'entrance_required');
});
