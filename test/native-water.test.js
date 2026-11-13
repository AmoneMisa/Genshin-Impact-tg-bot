import test from 'node:test';import assert from 'node:assert/strict';
import source from '../template/nativeWorld.js';import rules from '../template/nativeWaterRules.js';
import {nativeWaterZones,nativeInWater,nativeWaterSpans} from '../functions/game/world/nativeWaterGeometry.js';
import {nativeFluidCell,nativeSwimSegment,nativeSwimDestination,createNativeSwimJourney} from '../functions/game/world/nativeSwimJourney.js';
import {advanceNativeJourney} from '../functions/game/world/nativeJourney.js';
import {nativeGroundBlock} from '../functions/game/world/nativeGround.js';
import {nativeWaterBody,nativeBreathDuration,nativeSwimSpeed,advanceNativeWater,advanceNativeWaterSegment} from '../functions/game/world/nativeWater.js';
import change from '../functions/game/player/changePlayerGameClass.js';import update from '../functions/game/player/updatePlayerStats.js';import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import {worldAction,advanceWorld,worldState} from '../functions/game/world/world.js';import {nativeWorldPoint} from '../functions/game/world/nativeTravel.js';import {nativeFieldBuckets} from '../functions/game/world/nativeFieldSpace.js';
const NOW=1800000000000,from={x:85000,y:241000,z:-4500},to={x:85500,y:241000,z:-4500},allowed=p=>!nativeGroundBlock(p,{swimming:true});
function hero(name='humanFighter'){const s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1e6,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'native',city:'heine',nativePosition:{...from},path:[],moveAt:NOW,locks:{}}}};change(s,name);update(s);return s;}

test('all original water volumes retain height limits and overlapping membership without a fictional surface',()=>{
 assert.equal(source.water.length,447);assert.equal(rules.source.commit,source.source.commit);
 assert.ok(nativeWaterZones(from).length>1);assert.equal(nativeInWater({...from,z:10000}),false);assert.deepEqual(nativeWaterZones({x:NaN,y:0,z:0}),[]);
 for(const zone of source.water){
  const xs=zone.polygon.map(p=>p[0]),ys=zone.polygon.map(p=>p[1]),low=Math.min(zone.minZ,zone.maxZ),high=Math.max(zone.minZ,zone.maxZ),p={x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2,z:low};
  if(zone.shape!=='Cuboid')continue;
  assert.ok(nativeWaterZones(p).some(z=>z.id===zone.id));assert.ok(nativeWaterZones({...p,z:high}).some(z=>z.id===zone.id));
  assert.ok(!nativeWaterZones({...p,z:low-1}).some(z=>z.id===zone.id));assert.ok(!nativeWaterZones({...p,z:high+1}).some(z=>z.id===zone.id));
 }
});
test('exact interval union keeps a continuous underwater crossing submerged across overlapping volumes',()=>{
 const spans=nativeWaterSpans(from,to);assert.deepEqual(spans,[{start:0,end:1,water:true}]);
 const vertical=nativeWaterSpans(from,{...from,z:0});assert.equal(vertical[0].water,true);assert.equal(vertical.at(-1).water,false);assert.ok(vertical.some(s=>s.end<1));
 assert.equal(nativeWaterSpans(from,{x:Infinity,y:0,z:0}),null);
});
test('water speeds and breath use source race/class templates instead of ordinary run speed or fall safety',()=>{
 const s=hero();assert.equal(nativeWaterBody(s).fastSwim,50);assert.equal(nativeSwimSpeed(s,NOW),50);assert.equal(nativeBreathDuration(s,NOW),60000);
 const dwarf=hero('dwarvenFighter');assert.equal(nativeWaterBody(dwarf).breath,80);assert.equal(nativeBreathDuration(dwarf,NOW),48000);
 assert.equal(Object.keys(rules.players).length,103);assert.equal(rules.maxClickXY,700);
});
test('a saved breath task damages HP on original ticks, can kill, and cannot be reset by polling',()=>{
 let s=hero();advanceNativeWater(s,NOW,true);advanceNativeWater(s,NOW+59999,true);assert.equal(s.game.world.waterTask.enteredAt,NOW);
 const hp=s.game.gameClass.stats.hp,damage=Math.max(1,getMaxHp(s)/100);s=JSON.parse(JSON.stringify(s));advanceNativeWater(s,NOW+60000,true);assert.equal(s.game.gameClass.stats.hp,hp-damage);
 advanceNativeWater(s,NOW+60000,true);assert.equal(s.game.gameClass.stats.hp,hp-damage);advanceNativeWater(s,NOW+62000,true);assert.equal(s.game.gameClass.stats.hp,hp-damage*3);
 advanceNativeWater(s,NOW+1e10,true);assert.equal(s.game.gameClass.stats.hp,0);assert.equal(s.game.world.waterTask,undefined);assert.ok(s.game.deathLedger?.active);const death=s.game.deathLedger.at;advanceNativeWater(s,NOW+2e10,true);assert.equal(s.game.deathLedger.at,death);assert.equal(s.game.inventory.gold,1e6);
});
test('leaving all source volumes cancels the task, while moving within overlapping water preserves it',()=>{
 const s=hero();advanceNativeWaterSegment(s,from,to,NOW,NOW+10000);assert.equal(s.game.world.waterTask.enteredAt,NOW);
 advanceNativeWater(s,NOW+20000,false);assert.equal(s.game.world.waterTask,undefined);advanceNativeWater(s,NOW+30000,true);assert.equal(s.game.world.waterTask.nextAt,NOW+90000);
});
test('swimming keeps an actual free layer interval and rejects crossing a stored slab or fabricating vertical-only movement',()=>{
 assert.equal(nativeFluidCell(from).z,-4896);assert.ok(nativeSwimSegment(from,to));assert.equal(nativeSwimSegment(from,{...to,z:-5200}),false);
 assert.equal(nativeSwimSegment(from,{...from,z:-4600}),false);assert.equal(nativeSwimDestination(from,{...from,z:-4600}),null);
 assert.equal(nativeGroundBlock(from),'swimming_required');assert.equal(nativeGroundBlock(from,{swimming:true}),null);
 assert.deepEqual(nativeSwimDestination(from,{x:86000,y:241000,z:-4600}),{x:85700,y:241000,z:-4570});
});
test('a source-capped swim uses 3D distance, survives JSON, rejects altered positions, and respects blocked movement',()=>{
 let trip=createNativeSwimJourney(from,{x:85500,y:241000,z:-4600},{now:NOW,speed:50,allowed});assert.ok(trip);assert.equal(trip.native.remaining,Math.hypot(500,100));
 assert.equal(advanceNativeJourney(trip,NOW+1000,0,{allowed}),false);assert.deepEqual(trip.native.point,from);
 trip=JSON.parse(JSON.stringify(trip));assert.equal(advanceNativeJourney(trip,NOW+2000,50,{allowed}),false);assert.ok(Math.abs(Math.hypot(trip.native.point.x-from.x,trip.native.point.z-from.z)-50)<1e-7);
 const tampered=structuredClone(trip);tampered.native.point.y+=10;advanceNativeJourney(tampered,NOW+3000,50,{allowed});assert.equal(tampered.native.blocked,'path_blocked');
 assert.equal(advanceNativeJourney(trip,NOW+20000,50,{allowed}),true);assert.deepEqual(trip.native.point,{x:85500,y:241000,z:-4600});
});

test('Atlas swimming uses server depth, can surface to breathe and dive to the stored floor, preserving inventory and bank IDs',()=>{
 let s=hero();s.game.world.nativePosition={x:106350,y:197150,z:-3900};advanceWorld(s,NOW);
 const quiet=()=>{for(const m of nativeFieldBuckets(s.game.hunt?.field).flatMap(b=>b.mobs||[]))Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:NOW+1e12});};quiet();
 const ids=nativeFieldBuckets(s.game.hunt?.field).flatMap(b=>b.mobs||[]).map(m=>m.instanceId);
 assert.ok(worldAction(s,{action:'native_move',point:{x:106550,y:197150,z:-20000}},NOW).ok);s.game=JSON.parse(JSON.stringify(s.game));advanceWorld(s,NOW+10000);quiet();
 assert.deepEqual(nativeWorldPoint(s),{x:106550,y:197150,z:-3900},'an untrusted map Z cannot choose a layer');
 assert.ok(worldAction(s,{action:'native_water_depth',depth:'surface'},NOW+10000).ok);
 assert.ok(worldAction(s,{action:'native_step',direction:'east'},NOW+10000).ok);advanceWorld(s,NOW+20000);quiet();
 const surface=nativeWorldPoint(s);assert.ok(!nativeInWater(surface));assert.equal(s.game.world.waterTask,undefined);assert.equal(worldState(s,NOW+20000).player.water.atSurface,true);
 assert.ok(worldAction(s,{action:'native_water_depth',depth:'bottom'},NOW+20000).ok);
 assert.ok(worldAction(s,{action:'native_step',direction:'east'},NOW+20000).ok);advanceWorld(s,NOW+40000);quiet();
 const bottom=nativeWorldPoint(s);assert.ok(nativeInWater(bottom));assert.equal(nativeFluidCell(bottom).z,bottom.z);assert.ok(s.game.world.waterTask);assert.equal(s.game.inventory.gold,1e6);
 for(const id of ids)assert.ok(nativeFieldBuckets(s.game.hunt?.field).flatMap(b=>b.mobs||[]).some(m=>m.instanceId===id));
});
