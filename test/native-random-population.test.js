import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {enterHuntField,ensureHunt,advanceHunt,selectHuntTarget,setHuntAttack} from '../functions/game/hunt/huntFight.js';
import {activateNativeField,nativeFieldBuckets,nativeActorPoint} from '../functions/game/world/nativeFieldSpace.js';
import {sampleNativeTerritory,nativeTerritorySource} from '../functions/game/world/nativeSpawnTerritory.js';
import {worldAction,advanceWorld} from '../functions/game/world/world.js';
import {findNativePath} from '../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
import {pointInPolygon} from '../functions/game/world/navigation.js';
import {populationSlots,populationCapacity} from '../functions/game/hunt/sourcePopulation.js';
import {LOCATION_LEVELS} from '../template/locationLevels.js';
import policy from '../template/nativeFieldPilot.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000,zone='primeval-isle',group='rune17_2017_45',rooms=LOCATION_LEVELS[zone].floors[0].rooms,room=rooms.find(r=>r.spawns.some(s=>s.randomGroup===group)),entry=room.spawns.find(s=>s.randomGroup===group);
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const actors=s=>nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs||[]),members=s=>actors(s).filter(m=>m.sourceRandomGroup===group);
const quiet=(s,now)=>{for(const m of actors(s))Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:now+1e9});};
function fixture({oldEmpty=false,pending=false}={}){
 const s={userId:1,userChatData:{user:{id:1,first_name:'Test'}},game:{stats:{lvl:85,currentExp:0},inventory:{gold:1e6,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'location',location:zone,nativeIsland:zone,city:'rune',locks:{}}}};
 change(s,'humanFighter');update(s);assert.equal(enterHuntField(s,zone,{now:NOW,random:rng(1)}).ok,true);
 const f=s.game.hunt.field;Object.assign(f,{mobs:[],rooms:{},respawns:[],room:oldEmpty?room.id:'r0c0'});
 if(pending)f.respawns=[{room:room.id,sourceSlot:populationSlots(room).find(s=>s.randomGroup===group&&s.id==='22223').slot,at:NOW+1000}];
 const point=sampleNativeTerritory(nativeTerritorySource(zone,entry),{random:rng(111)});assert.ok(point);assert.equal(activateNativeField(s.game.hunt,point,NOW),true);ensureHunt(s,NOW,rng(7));quiet(s,NOW);return s;
}
test('all Primeval source polygons retain 710 alternative placements and a maximum initial quota of 672',()=>{
 const random=rng(111);let count=0;const groups=new Set();
 for(const r of rooms)for(const source of r.spawns){if(source.randomGroup)groups.add(source.randomGroup);for(let i=0;i<source.count;i++){const p=sampleNativeTerritory(nativeTerritorySource(zone,source),{random});assert.ok(p);assert.ok(pointInPolygon(p,source.polygon));assert.ok(nativeGroundAllowed(p));count++;}}
 assert.equal(count,710);assert.equal(groups.size,22);assert.equal(rooms.reduce((n,r)=>n+populationCapacity(r),0),672);
 assert.equal(policy.fields[zone].count,710);assert.equal(policy.fields[zone].initialCapacity,672);assert.equal(policy.fields[zone].randomGroupCount,22);
 assert.equal(policy.randomGroupSampling.selection,'random');assert.equal(createHash('sha256').update(fs.readFileSync('art-source/geodata/spawns/SpawnGroup.java')).digest('hex'),policy.randomGroupSampling.sha256);
});
test('a streamed random group keeps its selected quota through save/load, combat and a different-species respawn',t=>{
 let s=fixture(),now=NOW;assert.deepEqual(members(s).map(m=>m.mobId),['22199','22199','22199']);
 const ids=members(s).map(m=>m.instanceId);s=JSON.parse(JSON.stringify(s));ensureHunt(s,now,rng(99));quiet(s,now);assert.deepEqual(members(s).map(m=>m.instanceId),ids);
 const from=nativeActorPoint(s.game.hunt.field),mob=members(s).find(m=>findNativePath(from,nativeActorPoint(m),{allowed:nativeGroundAllowed,maxNodes:6000,stride:2,reversible:true}).ok);assert.ok(mob);
 assert.equal(worldAction(s,{action:'native_move',point:{...nativeActorPoint(mob),z:1e9}},now).ok,true);now=s.game.hunt.field.native.journey.until+1;advanceWorld(s,now);quiet(s,now);assert.equal(nativeActorPoint(s.game.hunt.field).z,mob.native.z);
 t.mock.method(Math,'random',()=>.99);mob.currentHp=1;assert.equal(selectHuntTarget(s,mob.instanceId,now).ok,true);assert.equal(setHuntAttack(s,true,now).ok,true);advanceHunt(s,now+2000,()=>.99);quiet(s,now+2000);assert.equal(s.game.hunt.kills,1);t.mock.restoreAll();
 const pending=s.game.hunt.field.respawns.find(r=>r.room===room.id&&populationSlots(room).find(p=>p.slot===r.sourceSlot)?.id==='22223');assert.ok(pending);assert.ok(pending.at>=now+2000+65000&&pending.at<=now+2000+135000);
 const paid=JSON.stringify(s.game.inventory);s=JSON.parse(JSON.stringify(s));advanceHunt(s,pending.at+1,rng(71));quiet(s,pending.at+1);assert.equal(s.game.hunt.kills,1);assert.equal(JSON.stringify(s.game.inventory),paid);
 assert.deepEqual(members(s).map(m=>m.mobId).sort(),['22199','22199','22223']);const replacement=members(s).find(m=>m.mobId==='22223');assert.ok(pointInPolygon(replacement.sourcePosition,entry.polygon));
 ensureHunt(s,pending.at+2,rng(1));assert.equal(members(s).length,3);assert.equal(new Set(actors(s).map(m=>m.sourceRoom+':'+m.sourceSlot)).size,actors(s).length);
});
test('migrating an exhausted room does not refill its random groups and retains a reserved species',()=>{
 const empty=fixture({oldEmpty:true});assert.equal(members(empty).length,0);ensureHunt(empty,NOW+1,rng(99));assert.equal(members(empty).length,0);
 const reserved=fixture({oldEmpty:true,pending:true});assert.equal(members(reserved).length,0);advanceHunt(reserved,NOW+1001,rng(71));assert.deepEqual(members(reserved).map(m=>m.mobId),['22223']);ensureHunt(reserved,NOW+1002,rng(7));assert.equal(members(reserved).length,1);
});
