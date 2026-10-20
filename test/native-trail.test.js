import test from 'node:test';
import assert from 'node:assert/strict';
import {worldAction,worldState,advanceWorld} from '../functions/game/world/world.js';
import {nativeTrailBack} from '../functions/game/world/nativeTrail.js';
import {nativeSegment} from '../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000;
function hero(){const s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'native',city:'oren',nativePosition:{x:82649.42016511616,y:53385.89098733623,z:-1488},path:[],moveAt:NOW,locks:{}}}};change(s,'humanFighter');update(s);return s;}
test('a saved free walk down the Oren slope can reverse its verified trail and resume the Sea of Spores route',()=>{
 let s=hero();const root={...s.game.world.nativePosition};
 assert.equal(worldAction(s,{action:'native_move',point:{x:76649.33998767142,y:53385.89098733623,z:99999}},NOW).ok,true);
 const until=s.game.world.walkHome.until;advanceWorld(s,until+1);assert.equal(s.game.world.mode,'native');
 assert.ok(s.game.world.nativeTrail.points.length<=512);assert.deepEqual(s.game.world.nativeTrail.points[0],root);
 const before={...s.game.world.nativePosition};assert.equal(before.z,-3128);s=JSON.parse(JSON.stringify(s));
 const back=nativeTrailBack(s.game.world);assert.ok(back);let at=before;for(const p of back.path){assert.ok(nativeSegment(at,p,{allowed:nativeGroundAllowed,reversible:true}));at=p;}
 assert.equal(JSON.stringify(worldState(s,until+1)).includes('nativeTrail'),false);
 const result=worldAction(s,{action:'walk_location',location:'sea-of-spores'},until+2);assert.equal(result.ok,true,result.reason);
 assert.deepEqual(s.game.world.walkHome.native.point,before);assert.ok(s.game.world.walkHome.native.path.length<=512);
 advanceWorld(s,s.game.world.walkHome.until+1);assert.equal(s.game.world.location,'sea-of-spores');assert.equal(s.game.world.nativeTrail,undefined);assert.equal(s.game.inventory.gold,1000000);
});
test('saved breadcrumbs cannot cross revision, layer, island or endpoint boundaries',()=>{
 const s=hero();assert.equal(worldAction(s,{action:'native_move',point:{x:76649.33998767142,y:53385.89098733623}},NOW).ok,true);advanceWorld(s,s.game.world.walkHome.until+1);
 const baseline=JSON.parse(JSON.stringify(s.game.world));
 for(const mutate of [w=>w.nativeTrail.commit='old',w=>w.nativeTrail.island='primeval-isle',w=>w.nativePosition.x+=16,w=>w.nativeTrail.points[0].z+=10000,w=>w.nativeTrail.points={}]){const world=JSON.parse(JSON.stringify(baseline));mutate(world);assert.equal(nativeTrailBack(world),null);}
});
