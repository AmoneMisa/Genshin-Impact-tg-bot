import test from 'node:test';
import assert from 'node:assert/strict';
import {worldAction,advanceWorld,worldState} from '../functions/game/world/world.js';
import {advanceHunt,selectHuntTarget,setHuntAttack} from '../functions/game/hunt/huntFight.js';
import {battleField} from '../functions/game/hunt/huntNeighborhood.js';
import {nativeFieldBuckets,nativeActorPoint,nativeFieldNear,placeNativeActor} from '../functions/game/world/nativeFieldSpace.js';
import {nativeCityAt} from '../functions/game/world/nativeTownGraph.js';
import {nativeTrailBack} from '../functions/game/world/nativeTrail.js';
import routes from '../template/nativeRoutes.js';
import pilot from '../template/nativeFieldPilot.js';
import {LOCATION_LEVELS} from '../template/locationLevels.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
const START=1800000000000;
function hero(){
 const s={userId:1,userChatData:{user:{id:1,first_name:'Test'}},game:{stats:{lvl:25,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:'gludio',x:.5,y:.5,path:[],moveAt:START,locks:{}}}};
 const chat={game:{},members:[s]};s.ownerDocument=()=>chat;
 change(s,'humanFighter');update(s);return s;
}
function arrive(s){assert.equal(worldAction(s,{action:'walk_location',location:'vuku-lands'},START).ok,true);const now=s.game.world.walkHome.until+1;advanceWorld(s,now);return now;}
function quiet(s,now){for(const bank of nativeFieldBuckets(s.game.hunt.field))for(const mob of bank.mobs){mob.aggro=false;mob.aggressive=false;mob.nextAttackAt=now+1e9;}}
test('Gludio road reaches the native combat field without moving its endpoint or creating room copies',()=>{
 const s=hero(),now=arrive(s),dto=worldState(s,now),f=s.game.hunt.field;
 for(const key of ['x','y','z'])assert.equal(dto.player.worldPoint[key],routes.routes['vuku-lands'].to[key]);assert.equal(dto.nativeField.zone,'vuku-lands');
 assert.equal(s.game.inventory.gold,1000000);assert.ok(dto.nativeField.actors.length>0&&dto.nativeField.actors.length<=48);
 const actors=nativeFieldBuckets(f).flatMap(b=>b.mobs),keys=actors.map(m=>m.sourceRoom+':'+m.sourceSlot);
 assert.equal(new Set(keys).size,keys.length);
 for(const mob of actors){const p=nativeActorPoint(mob);assert.equal(p.x,mob.sourcePosition.x);assert.equal(p.y,mob.sourcePosition.y);assert.ok(Math.abs(p.z-mob.sourcePosition.z)<=40);}
 assert.equal(pilot.actors['20011'].attackRange,1100);assert.equal(pilot.actors['20011'].runSpeed,110);
});
test('native combat movement ignores client height and keeps one budget through save/load',()=>{
 const s=hero(),now=arrive(s);quiet(s,now);const before=worldState(s,now).player.worldPoint;
 const moved=worldAction(s,{action:'native_move',point:{x:before.x+80,y:before.y,z:999999,zone:'giran',floor:99}},now);
 assert.equal(moved.ok,true);
 const saved=JSON.parse(JSON.stringify(s));
 advanceWorld(s,now+400);advanceWorld(saved,now+200);advanceWorld(saved,now+400);
 const a=worldState(s,now+400).player.worldPoint,b=worldState(saved,now+400).player.worldPoint;
 assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-7);assert.equal(a.z,b.z);assert.notEqual(a.z,999999);
 assert.equal(s.game.world.location,'vuku-lands');assert.equal(s.game.hunt.field.floor,1);
 assert.ok(Math.hypot(a.x-before.x,a.y-before.y)<=80);
});
test('an attack already in reach stops the saved native walk instead of continuing underneath combat',()=>{
 const s=hero(),now=arrive(s);quiet(s,now);const f=s.game.hunt.field;
 const mob=battleField(s.game.hunt).mobs.find(m=>Math.hypot(m.x-f.x,m.y-f.y)<.001);assert.ok(mob);
 assert.equal(selectHuntTarget(s,mob.instanceId,now).ok,true);const point=nativeActorPoint(f);
 assert.equal(worldAction(s,{action:'native_move',point:{x:point.x+80,y:point.y}},now).ok,true);assert.ok(f.native.journey);
 assert.equal(setHuntAttack(s,true,now).ok,true);assert.equal(f.native.journey,undefined);
 advanceHunt(s,now+500);assert.deepEqual(nativeActorPoint(f),point);
});
test('the road streams native actors before arrival and retains the same remaining journey',()=>{
 const s=hero();assert.equal(worldAction(s,{action:'walk_location',location:'vuku-lands'},START).ok,true);
 const trip=s.game.world.walkHome;let previous=trip.native.point,distance=0,entry=null;
 for(const point of trip.native.path){distance+=Math.hypot(point.x-previous.x,point.y-previous.y);previous=point;if(nativeFieldNear(point)&&!nativeCityAt(point)){entry=point;break;}}
 assert.ok(entry);const at=START+Math.ceil(distance/trip.native.remaining*(trip.until-START))+1;
 assert.ok(at<trip.until);advanceWorld(s,at);
 assert.equal(s.game.world.mode,'location');assert.equal(s.game.hunt.field.native.journey,trip);assert.ok(trip.native.remaining>0);
 assert.deepEqual(nativeActorPoint(s.game.hunt.field),{x:trip.native.point.x,y:trip.native.point.y,z:trip.native.point.z});
 quiet(s,at);assert.equal(worldAction(s,{action:'native_stop'},at).ok,true);const stopped=nativeActorPoint(s.game.hunt.field);
 advanceWorld(s,at+5000);assert.deepEqual(nativeActorPoint(s.game.hunt.field),stopped);assert.equal(s.game.inventory.gold,1000000);
});
test('returning through the native city road preserves the original actor identity and health',()=>{
 const s=hero(),now=arrive(s);quiet(s,now);const mob=battleField(s.game.hunt).mobs[0];mob.currentHp=Math.floor(mob.hp/2);
 const saved={id:mob.instanceId,hp:mob.currentHp};
 assert.equal(worldAction(s,{action:'native_walk_city',city:'gludio'},now).ok,true);
 const back=s.game.world.walkHome.until+1;advanceWorld(s,back);assert.equal(s.game.world.mode,'city');
 assert.equal(worldAction(s,{action:'walk_location',location:'vuku-lands'},back+1).ok,true);const again=s.game.world.walkHome.until+1;advanceWorld(s,again);
 const restored=battleField(s.game.hunt).mobs.find(m=>m.instanceId===saved.id);assert.ok(restored);assert.equal(restored.currentHp,saved.hp);
 const actors=nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs);assert.equal(actors.filter(m=>m.instanceId===saved.id).length,1);
});
test('a source-position mob takes ordinary combat damage, rewards once, and respawns at its original point',()=>{
 const s=hero(),now=arrive(s);quiet(s,now);
 const target=battleField(s.game.hunt).mobs.find(m=>Math.hypot(m.x-s.game.hunt.field.x,m.y-s.game.hunt.field.y)<.001);
 assert.ok(target);const source={...target.sourcePosition},slot=target.sourceSlot,room=target.sourceRoom;
 assert.equal(selectHuntTarget(s,target.instanceId,now).ok,true);target.currentHp=1;
 assert.equal(setHuntAttack(s,true,now).ok,true);
 advanceHunt(s,now+2000,()=>.99);
 assert.equal(s.game.hunt.kills,1);assert.ok(target.rewarded);
 const pending=s.game.hunt.field.respawns.find(r=>r.room===room&&r.sourceSlot===slot);assert.ok(pending);
 const saved=JSON.parse(JSON.stringify(s));advanceHunt(saved,pending.at+1,()=>.99);
 const mob=nativeFieldBuckets(saved.game.hunt.field).flatMap(b=>b.mobs).find(m=>m.sourceRoom===room&&m.sourceSlot===slot);
 assert.ok(mob);assert.notEqual(mob.instanceId,target.instanceId);assert.deepEqual(mob.sourcePosition,source);
 assert.equal(nativeActorPoint(mob).x,source.x);assert.equal(nativeActorPoint(mob).y,source.y);assert.equal(saved.game.hunt.kills,1);
});
test('free walking inside the native field keeps a reversible saved trail without exposing it',()=>{
 const s=hero();let now=arrive(s);quiet(s,now);const root=nativeActorPoint(s.game.hunt.field);
 for(const goal of [{x:root.x+80,y:root.y},{x:root.x+160,y:root.y}]){
  assert.equal(worldAction(s,{action:'native_move',point:goal},now).ok,true);
  now=s.game.hunt.field.native.journey.until+1;advanceWorld(s,now);quiet(s,now);
 }
 const saved=JSON.parse(JSON.stringify(s)),f=saved.game.hunt.field;
 const trail=nativeTrailBack({nativePosition:nativeActorPoint(f),nativeTrail:f.native.nativeTrail});
 assert.ok(trail);assert.deepEqual(trail.root,root);
 const dto=worldState(saved,now);assert.equal(JSON.stringify(dto).includes('historyStart'),false);assert.equal(JSON.stringify(dto).includes('nativeTrail'),false);
});
test('death clears the native movement intent and aggression in every source bank',()=>{
 const s=hero(),now=arrive(s),point=worldState(s,now).player.worldPoint;quiet(s,now);
 assert.equal(worldAction(s,{action:'native_move',point:{x:point.x+80,y:point.y}},now).ok,true);
 for(const bank of nativeFieldBuckets(s.game.hunt.field))for(const m of bank.mobs)m.aggro=true;
 s.game.gameClass.stats.hp=0;worldState(s,now+1);
 assert.equal(s.game.hunt.field.native.journey,undefined);assert.equal(s.game.hunt.field.path.length,0);
 assert.ok(nativeFieldBuckets(s.game.hunt.field).every(b=>b.mobs.every(m=>!m.aggro)));
 const at=nativeActorPoint(s.game.hunt.field);advanceWorld(s,now+10000);assert.deepEqual(nativeActorPoint(s.game.hunt.field),at);
});
test('walking into the native field keeps the physical trail from outside its combat space',()=>{
 const s=hero(),r=routes.routes['vuku-lands'],xyz=p=>({x:p.x,y:p.y,z:p.z});
 Object.assign(s.game.world,{mode:'native',nativePosition:xyz(r.to),nativeTrail:{commit:routes.geodataCommit,island:null,points:[xyz(r.path.at(-2)),xyz(r.to)]}});
 const dto=worldState(s,START);assert.equal(dto.player.mode,'location');
 const f=s.game.hunt.field,back=nativeTrailBack({nativePosition:nativeActorPoint(f),nativeTrail:f.native.nativeTrail});
 assert.ok(back);assert.deepEqual(back.root,xyz(r.path.at(-2)));
});
test('ground monster spawn height follows the original Spawn.java threshold rather than a walking step',()=>{
 const source={x:161746,y:83536,z:-2864},actor={};
 assert.equal(placeNativeActor(actor,source),true);assert.equal(nativeActorPoint(actor).z,-2704);
 assert.deepEqual(source,{x:161746,y:83536,z:-2864});
 const boundary={};assert.equal(placeNativeActor(boundary,{...source,z:-3004}),true,'exactly 300 units retains original Z');assert.equal(nativeActorPoint(boundary).z,-3004);
 assert.equal(pilot.groundSpawnHeight.maxCorrectionExclusive,300);assert.match(pilot.groundSpawnHeight.sha256,/^[a-f0-9]{64}$/);
});
test('Angel Waterfall walks from Aden into native combat while its noblesse teleport remains restricted',()=>{
 const s=hero();s.game.stats.lvl=58;s.game.world.city='aden';update(s);
 assert.equal(worldAction(s,{action:'quick_travel',location:'angel-waterfall'},START).reason,'noblesse_required');
 assert.equal(worldAction(s,{action:'walk_location',location:'angel-waterfall'},START).ok,true);
 const now=s.game.world.walkHome.until+1;advanceWorld(s,now);quiet(s,now);
 const dto=worldState(s,now),f=s.game.hunt.field;
 assert.equal(dto.nativeField.zone,'angel-waterfall');assert.equal(s.game.world.city,'aden');
 assert.deepEqual(dto.nativeField.point,routes.routes['angel-waterfall'].to);
 assert.ok(dto.nativeField.actors.length>0);assert.equal(s.game.inventory.gold,1000000);
 const mob=battleField(s.game.hunt).mobs[0];mob.currentHp=Math.floor(mob.hp/2);const saved={id:mob.instanceId,hp:mob.currentHp};
 assert.equal(worldAction(s,{action:'native_walk_city',city:'aden'},now).ok,true);
 const back=s.game.world.walkHome.until+1;advanceWorld(s,back);assert.equal(s.game.world.mode,'city');
 assert.equal(worldAction(s,{action:'walk_location',location:'angel-waterfall'},back+1).ok,true);
 const again=s.game.world.walkHome.until+1;advanceWorld(s,again);
 const restored=battleField(s.game.hunt).mobs.find(m=>m.instanceId===saved.id);assert.ok(restored);assert.equal(restored.currentHp,saved.hp);
 assert.equal(nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs).filter(m=>m.instanceId===saved.id).length,1);
 assert.equal(s.game.world.nativeFields['vuku-lands'],undefined);
});
test('all 49 Angel Waterfall fixed spawns retain original XY and valid H5 spawn heights',()=>{
 const slots=LOCATION_LEVELS['angel-waterfall'].floors[0].rooms.flatMap(r=>r.spawns);
 assert.equal(slots.length,49);assert.equal(pilot.fields['angel-waterfall'].count,49);
 for(const source of slots){const actor={};assert.equal(placeNativeActor(actor,source),true);const p=nativeActorPoint(actor);
  assert.equal(p.x,source.x);assert.equal(p.y,source.y);assert.ok(Math.abs(p.z-source.z)<300);
  assert.deepEqual(pilot.actors[source.id],{runSpeed:174,attackRange:40});
 }
});
test('Marsh Zombies use all 375 original ground positions and preserve population through their town route',()=>{
 const zone='marsh-zombies',s=hero();s.game.world.city='dark-elven-village';
 const slots=LOCATION_LEVELS[zone].floors[0].rooms.flatMap(r=>r.spawns);assert.equal(slots.length,375);
 for(const source of slots){const actor={};assert.equal(placeNativeActor(actor,source),true);const p=nativeActorPoint(actor);
  assert.equal(p.x,source.x);assert.equal(p.y,source.y);assert.ok(Math.abs(p.z-source.z)<300);
 }
 assert.deepEqual(pilot.actors['20015'],{runSpeed:15,attackRange:40});
 assert.deepEqual(pilot.actors['20379'],{runSpeed:23,attackRange:40});
 assert.equal(worldAction(s,{action:'walk_location',location:zone},START).ok,true);
 const now=s.game.world.walkHome.until+1;advanceWorld(s,now);quiet(s,now);
 const dto=worldState(s,now);assert.equal(dto.nativeField.zone,zone);assert.deepEqual(dto.nativeField.point,routes.routes[zone].to);
 assert.ok(dto.nativeField.actors.length>0&&dto.nativeField.actors.length<=48);
 const mobs=nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs),keys=mobs.map(m=>m.sourceRoom+':'+m.sourceSlot);
 assert.equal(keys.length,new Set(keys).size);assert.ok(mobs.every(m=>pilot.fields[zone].npcIds.includes(m.mobId)));
 const mob=mobs[0],hp=Math.floor(mob.hp/2);mob.currentHp=hp;
 assert.equal(worldAction(s,{action:'native_walk_city',city:'dark-elven-village'},now).ok,true);
 const back=s.game.world.walkHome.until+1;advanceWorld(s,back);assert.equal(s.game.world.mode,'city');
 assert.equal(worldAction(s,{action:'walk_location',location:zone},back+1).ok,true);
 const end=s.game.world.walkHome.until+1;advanceWorld(s,end);
 assert.equal(nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs).find(m=>m.instanceId===mob.instanceId).currentHp,hp);
 assert.equal(s.game.inventory.gold,1000000);
});
