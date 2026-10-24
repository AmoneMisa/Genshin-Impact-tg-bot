import test from 'node:test';
import assert from 'node:assert/strict';
import {enterHuntField,ensureHunt} from '../functions/game/hunt/huntFight.js';
import {populationSlots} from '../functions/game/hunt/sourcePopulation.js';
import {nativeFieldBuckets,nativeActorPoint,NATIVE_FIELD_RADIUS,placeNativeActor} from '../functions/game/world/nativeFieldSpace.js';
import {LOCATION_LEVELS} from '../template/locationLevels.js';
import {ROOM_SIZE} from '../functions/game/world/navigation.js';
import source from '../template/hellboundAccess.js';
import minions from '../template/nativeMinions.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';

const NOW=1800000000000,rooms=LOCATION_LEVELS.hellbound.floors[0].rooms;
const actors=f=>nativeFieldBuckets(f).flatMap(b=>b.mobs||[]);
function fixture(stage=1,point=source.entry){
 const chat={game:{hellbound:{level:stage}}},s={userId:1,ownerDocument:()=>chat,game:{stats:{lvl:85,currentExp:0},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 change(s,'humanFighter');update(s);assert.ok(enterHuntField(s,'hellbound',{now:NOW}).ok);
 // Exercise the world population engine independently of enabling this island
 // in the registry; source portal and tower transitions have their own rollout.
 const f=s.game.hunt.field;Object.assign(f,{x:point.x/ROOM_SIZE,y:point.y/ROOM_SIZE,mobs:[],rooms:{},walls:[],native:{version:1,z:point.z,loaded:{},missing:{},randomGroups:{}}});
 ensureHunt(s,NOW);return {s,chat,f};
}
function verify(s){
 const f=s.game.hunt.field,allowed=new Map(rooms.flatMap(r=>populationSlots(r,s,'hellbound').map(p=>[r.id+':'+p.slot,p]))),mobs=actors(f);
 assert.equal(new Set(mobs.map(m=>m.sourceRoom+':'+m.sourceSlot)).size,mobs.length);
 for(const m of mobs){
  const p=allowed.get(m.sourceMinion?.owner||m.sourceRoom+':'+m.sourceSlot);assert.ok(p,'inactive phase cannot create an actor or its private');
  if(m.sourceMinion){
   assert.equal(m.sourceMinion.masterId,p.id);assert.ok(minions.masters[p.id].entries.some(e=>e.id===m.mobId));
   const master=mobs.find(a=>!a.sourceMinion&&a.sourceRoom+':'+a.sourceSlot===m.sourceMinion.owner);assert.ok(master);
   assert.ok(Math.hypot((m.x-master.x)*ROOM_SIZE,(m.y-master.y)*ROOM_SIZE)<=Math.SQRT2*minions.spawnOffsetRadius);
   assert.equal(f.native.minionFamilies[m.sourceMinion.owner].epoch,master.instanceId);
   assert.equal(m.native.hellboundStage,f.populationStage);
  }else{const original={};assert.ok(placeNativeActor(original,p));assert.deepEqual(nativeActorPoint(m),nativeActorPoint(original));}
  assert.ok(Math.hypot((m.x-f.x)*ROOM_SIZE,(m.y-f.y)*ROOM_SIZE)<=NATIVE_FIELD_RADIUS+(m.sourceMinion?Math.SQRT2*minions.spawnOffsetRadius:0));
 }
 for(const key of [...Object.keys(f.native.loaded),...Object.keys(f.native.missing)])assert.ok(allowed.has(key),'inactive phase cannot poison residency or missing-ground keys');
 for(const key of Object.keys(f.native.minionFamilies||{}))assert.ok(allowed.has(key),'inactive families cannot poison the next phase');
 return mobs;
}
test('native population streams only active source slots through every Hellbound stage, including zero',()=>{
 const {s,chat}=fixture();assert.ok(verify(s).length);
 for(const stage of [0,1,2,3,4,5,6,7,8,9,10,11,1]){chat.game.hellbound.level=stage;ensureHunt(s,NOW+stage+100);const mobs=verify(s);if(stage===0)assert.equal(mobs.length,0);else assert.ok(mobs.length);}
});
test('native phase changes preserve surviving ownership, reset source HP once and cancel pending respawns',()=>{
 const {s,chat,f}=fixture(),victim=actors(f).find(m=>m.currentHp>0);assert.ok(victim);victim.currentHp=1;
 f.respawns=[{room:victim.sourceRoom,sourceSlot:victim.sourceSlot,at:NOW+50000}];
 ensureHunt(s,NOW+1);assert.equal(victim.currentHp,1);assert.equal(f.respawns.length,1);
 const saved=JSON.parse(JSON.stringify(s));saved.ownerDocument=()=>chat;ensureHunt(saved,NOW+2);assert.equal(actors(saved.game.hunt.field).find(m=>m.instanceId===victim.instanceId).currentHp,1);
 chat.game.hellbound.level=2;const inventory=JSON.stringify(s.game.inventory);ensureHunt(s,NOW+3);
 const survivor=verify(s).find(m=>m.sourceRoom===victim.sourceRoom&&m.sourceSlot===victim.sourceSlot);assert.ok(survivor);assert.equal(survivor.instanceId,victim.instanceId);assert.equal(survivor.currentHp,survivor.hp);assert.equal(f.respawns.length,0);assert.equal(JSON.stringify(s.game.inventory),inventory);
 survivor.currentHp=2;ensureHunt(s,NOW+4);assert.equal(survivor.currentHp,2);
 chat.game.hellbound.level=0;ensureHunt(s,NOW+5);assert.equal(verify(s).length,0);assert.equal(f.target,null);
 chat.game.hellbound.level=1;ensureHunt(s,NOW+6);assert.ok(verify(s).length,'previously inactive source slots must activate again');
});
test('a surviving native NPC keeps its reached position when doSpawn refreshes the phase',()=>{
 const {s,chat,f}=fixture(),m=actors(f)[0];m.x+=16/ROOM_SIZE;m.buffs=[{id:'fixture',until:NOW+100000}];const point=nativeActorPoint(m),id=m.instanceId;
 chat.game.hellbound.level=2;ensureHunt(s,NOW+1);const survivor=actors(f).find(a=>a.instanceId===id);assert.ok(survivor);assert.deepEqual(nativeActorPoint(survivor),point);assert.deepEqual(survivor.buffs,m.buffs);assert.equal(survivor.currentHp,survivor.hp);
});

test('Hellbound stage refresh preserves private ownership and binds rejected proposals to the restored master epoch',()=>{
 const {s,chat,f}=fixture(),child=actors(f).find(m=>m.sourceMinion);assert.ok(child);
 const id=child.instanceId,owner=child.sourceMinion.owner;child.currentHp=1;child.x+=16/ROOM_SIZE;const point=nativeActorPoint(child);
 chat.game.hellbound.level=2;ensureHunt(s,NOW+1);
 const survivor=actors(f).find(m=>m.instanceId===id);assert.ok(survivor);assert.deepEqual(nativeActorPoint(survivor),point);assert.equal(survivor.currentHp,survivor.hp);
 const master=actors(f).find(m=>!m.sourceMinion&&m.sourceRoom+':'+m.sourceSlot===owner);assert.ok(master);
 assert.equal(f.native.minionFamilies[owner].epoch,master.instanceId);
 const families=JSON.stringify(f.native.minionFamilies),ids=actors(f).map(m=>m.instanceId);ensureHunt(s,NOW+2);
 assert.equal(JSON.stringify(f.native.minionFamilies),families);assert.deepEqual(actors(f).map(m=>m.instanceId),ids);
 chat.game.hellbound.level=0;ensureHunt(s,NOW+3);assert.deepEqual(f.native.minionFamilies,{});assert.equal(actors(f).length,0);
});
