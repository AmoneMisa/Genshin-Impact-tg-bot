import test from 'node:test';
import assert from 'node:assert/strict';
import {pruneNativeLoops,createNativeJourney,nativeDistance} from '../functions/game/world/nativeJourney.js';
import {worldAction,advanceWorld} from '../functions/game/world/world.js';
import {nativeTownHub,nativeTownEdges} from '../functions/game/world/nativeTownGraph.js';
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
 assert.ok(Math.abs(trip.native.remaining-expected)<1e-6,'use only the verified branch between those entrances');
 s=JSON.parse(JSON.stringify(s));advanceWorld(s,NOW+2e7);assert.equal(s.game.world.location,'frozen-labyrinth');await getHuntState(s,NOW+2e7);quiet(s);
 assert.equal(worldAction(s,{action:'walk_location',location:'monastery-of-silence'},NOW+2e7).ok,true);advanceWorld(s,NOW+3e7);quiet(s);
 assert.equal(s.game.hunt.field.mobs.find(m=>m.instanceId===id)?.currentHp,2);assert.equal(s.game.inventory.gold,1000000);
});
test('a character standing at the original entrance can enter without a loop or a coordinate change',()=>{
 const s=hero(),point=routes.routes['monastery-of-silence'].to;s.game.world.mode='native';s.game.world.nativePosition={...point};
 assert.equal(worldAction(s,{action:'walk_location',location:'monastery-of-silence'},NOW).ok,true);assert.equal(s.game.world.walkHome.native.remaining,0);assert.ok(same(s.game.world.walkHome.native.point,point));
 advanceWorld(s,NOW+1);assert.equal(s.game.world.location,'monastery-of-silence');assert.equal(s.game.inventory.gold,1000000);
});
