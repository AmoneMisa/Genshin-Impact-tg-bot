import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import approaches from '../template/nativeInteriorRoutes.js';
import outside from '../template/nativeRoutes.js';
import {nativeRoute} from '../functions/game/world/nativeTravel.js';
import {nativeSegment} from '../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
import {nativeActorPoint,nativeFieldBuckets} from '../functions/game/world/nativeFieldSpace.js';
import {worldAction,advanceWorld,worldState} from '../functions/game/world/world.js';
import {LOCATION_LEVELS} from '../template/locationLevels.js';
import {MISSING_WORLD_SOURCE} from '../docs/missing-world-sources.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
const START=1800000000000,id='stakato-nest';
function hero(){const s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1e6,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:'rune',x:.5,y:.5,path:[],moveAt:START,locks:{}}}};const chat={game:{},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);return s;}
const quiet=s=>{for(const b of nativeFieldBuckets(s.game.hunt?.field))for(const m of b.mobs||[])Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:START+1e12});};
test('Stakato cave approach keeps the pinned NPC, outside entry and every reversible layer',()=>{
 const a=approaches.routes[id],route=nativeRoute(id);assert.equal(approaches.geodataCommit,outside.geodataCommit);assert.equal(approaches.barriersSha256,createHash('sha256').update(fs.readFileSync('template/nativeWorld.js')).digest('hex'));
 assert.deepEqual(route.entry,outside.routes[id].to);assert.equal(a.sourceSpawn.sha256,MISSING_WORLD_SOURCE.files[a.sourceSpawn.file]);
 const slot=LOCATION_LEVELS[id].floors[0].rooms.flatMap(r=>r.spawns||[]).find(s=>s.id===a.sourceSpawn.id&&s.x===a.sourceSpawn.x&&s.y===a.sourceSpawn.y&&s.z===a.sourceSpawn.z);assert.ok(slot);assert.equal(a.to.x,slot.x);assert.equal(a.to.y,slot.y);
 assert.equal(a.from.z,-2136);assert.equal(a.to.z,-4640);
 let before=a.from;for(const p of a.path){assert.ok(nativeSegment(before,p,{allowed:nativeGroundAllowed,reversible:true}));before=p;}
 for(const p of a.returnPath){assert.ok(nativeSegment(before,p,{allowed:nativeGroundAllowed,reversible:true}));before=p;}assert.deepEqual(before,a.from);
});
test('paid Stakato travel keeps the original surface destination and can continue downstairs through the same Atlas',()=>{
 const s=hero();assert.equal(worldAction(s,{action:'quick_travel',location:id},START).ok,true);quiet(s);
 assert.deepEqual(nativeActorPoint(s.game.hunt.field),outside.routes[id].to);assert.equal(worldState(s,START).nativeField.actors.length,0,'no cave NPC through the ceiling');
 assert.equal(worldState(s,START).nativeWalk[id].enabled,true);const gold=s.game.inventory.gold;
 assert.equal(worldAction(s,{action:'walk_location',location:id},START+1).ok,true);const trip=s.game.world.walkHome||s.game.hunt.field.native.journey;assert.ok(trip?.native);
 const saved=JSON.parse(JSON.stringify(s)),end=trip.until+1;advanceWorld(saved,end);quiet(saved);
 assert.deepEqual(nativeActorPoint(saved.game.hunt.field),nativeRoute(id).to);assert.ok(worldState(saved,end).nativeField.actors.length>0);assert.equal(saved.game.inventory.gold,gold);
 assert.equal(worldState(saved,end).nativeWalk[id].enabled,false);assert.equal(worldAction(saved,{action:'walk_location',location:id},end).ok,false);
});
