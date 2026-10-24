import {nativeRoute} from '../functions/game/world/nativeTravel.js';
import {nativeActorPoint,nativeFieldBuckets} from '../functions/game/world/nativeFieldSpace.js';
import {nativeSegment} from '../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {pruneNativeLoops,createNativeJourney,nativeDistance} from '../functions/game/world/nativeJourney.js';
import {worldAction,advanceWorld} from '../functions/game/world/world.js';
import {nativeTownHub,nativeTownEdges,nativeCityAt} from '../functions/game/world/nativeTownGraph.js';
import {getHuntState} from '../miniapp/hunt.js';
import routes from '../template/nativeRoutes.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000,same=(a,b)=>['x','y','z'].every(k=>a[k]===b[k]);
function hero(){const s={userId:1,game:{stats:{lvl:85},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:'goddard',x:.5,y:.5,path:[],moveAt:NOW,locks:{}}}};change(s,'humanFighter');update(s);return s;}
function quiet(s){const f=s.game.hunt.field;for(const m of [f,...Object.values(f.rooms||{})].flatMap(r=>r.mobs||[]))Object.assign(m,{aggressive:false,aggro:false,aggroRange:0,nextAttackAt:NOW+1e12});}
test('loop removal preserves distinct bridge heights and cannot conceal invalid coordinates',()=>{
 const a={x:0,y:0,z:0},bridge={x:0,y:0,z:100},b={x:16,y:0,z:0};
 assert.deepEqual(pruneNativeLoops(a,[b,bridge]),[b,bridge]);
 assert.equal(createNativeJourney(a,pruneNativeLoops(a,[b,{x:NaN,y:0,z:0},a]),{now:NOW,speed:100}),null);
 assert.deepEqual(pruneNativeLoops(a,[b,a]),[a]);
});
test('Monastery and Labyrinth join at their shared road without detouring through either town, preserving NPCs',async()=>{
 let s=hero();assert.equal(worldAction(s,{action:'walk_location',location:'monastery-of-silence'},NOW).ok,true);advanceWorld(s,NOW+1e7);
 await getHuntState(s,NOW+1e7);quiet(s);const mob=s.game.hunt.field.mobs[0],id=mob.instanceId;mob.currentHp=2;
 assert.equal(worldAction(s,{action:'walk_location',location:'frozen-labyrinth'},NOW+1e7).ok,true);
 const trip=s.game.world.walkHome;for(const city of ['goddard','schuttgart'])assert.equal(trip.native.path.some(p=>same(p,nativeTownHub(city))),false);
 const road=nativeTownEdges().find(r=>r.fromCity==='goddard'&&r.toCity==='schuttgart'),vertices=[road.from,...road.path];
 const begin=vertices.findIndex(p=>same(p,routes.routes['monastery-of-silence'].to)),end=vertices.findIndex(p=>same(p,routes.routes['frozen-labyrinth'].to));assert.ok(begin>=0&&end>begin);
 const expected=vertices.slice(begin+1,end+1).reduce((n,p,i)=>n+nativeDistance(vertices[begin+i],p),0);
 const cave=nativeRoute('monastery-of-silence');let previous=cave.entry,caveDistance=0;for(const p of cave.path.slice(routes.routes['monastery-of-silence'].path.length)){caveDistance+=nativeDistance(previous,p);previous=p;}
 assert.ok(trip.native.remaining<=expected+caveDistance+8192,'reconnecting from inside the cave must stay within one local join of the shared road');
 previous=trip.native.point;for(const p of trip.native.path){assert.equal(nativeCityAt(p),null,'a cave road must not enter a town');assert.ok(nativeSegment(previous,p,{allowed:nativeGroundAllowed,reversible:true}));previous=p;}
 s=JSON.parse(JSON.stringify(s));advanceWorld(s,NOW+2e7);assert.equal(s.game.world.location,'frozen-labyrinth');await getHuntState(s,NOW+2e7);quiet(s);
 assert.equal(worldAction(s,{action:'walk_location',location:'monastery-of-silence'},NOW+2e7).ok,true);advanceWorld(s,NOW+3e7);quiet(s);
 assert.equal(nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs).find(m=>m.instanceId===id)?.currentHp,2);assert.equal(s.game.inventory.gold,1000000);
});
test('a character at the checked inside endpoint attaches the cave bank without another walk',()=>{
 const s=hero(),point=nativeRoute('monastery-of-silence').to;s.game.world.mode='native';s.game.world.nativePosition={...point};
 advanceWorld(s,NOW);assert.equal(s.game.world.location,'monastery-of-silence');assert.deepEqual(nativeActorPoint(s.game.hunt.field),point);assert.equal(s.game.hunt.field.native.journey,undefined);assert.equal(s.game.inventory.gold,1000000);
});
test('the original outside Monastery anchor starts a real cave approach without granting distance',()=>{
 const s=hero(),point=routes.routes['monastery-of-silence'].to;s.game.world.mode='native';s.game.world.nativePosition={...point};
 assert.equal(worldAction(s,{action:'walk_location',location:'monastery-of-silence'},NOW).ok,true);const trip=s.game.world.walkHome||s.game.hunt.field.native.journey;assert.ok(trip.native.remaining>0);assert.ok(same(trip.native.point,point));
 advanceWorld(s,trip.until+1);assert.equal(s.game.world.location,'monastery-of-silence');assert.deepEqual(nativeActorPoint(s.game.hunt.field),nativeRoute('monastery-of-silence').to);assert.equal(s.game.inventory.gold,1000000);
});
