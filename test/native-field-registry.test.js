import test from 'node:test';
import assert from 'node:assert/strict';
import {worldAction,advanceWorld,worldState} from '../functions/game/world/world.js';
import {nativeFieldBuckets,nativeActorPoint,placeNativeActor} from '../functions/game/world/nativeFieldSpace.js';
import {LOCATION_LEVELS} from '../template/locationLevels.js';
import registry from '../template/nativeFieldPilot.js';
import routes from '../template/nativeRoutes.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
const START=1800000000000;
const actors=s=>nativeFieldBuckets(s.game.hunt?.field).flatMap(b=>b.mobs||[]);
const quiet=(s,now)=>{for(const m of actors(s))Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:now+1e9});};
test('Ragna minion references cannot overwrite their independent source movement templates',()=>{
 assert.deepEqual(registry.actors['22695'],{runSpeed:120,attackRange:40});
 assert.deepEqual(registry.actors['22698'],{runSpeed:110,attackRange:1100});
 assert.deepEqual(registry.fields['den-of-evil'].unportedMinionTemplates,['22693','22694','22697']);
 assert.deepEqual(registry.npcMinionTemplates['22693'],[
  {name:'Privates1',npcs:[{id:'22695',count:'1',respawnTime:'0',weightPoint:'1'}]},
  {name:'Privates2',npcs:[{id:'22692',count:'1',respawnTime:'0',weightPoint:'1'}]}
 ]);
});
function hero(zone){
 const city=registry.fields[zone].city,lvl=Math.min(85,Math.max(...LOCATION_LEVELS[zone].mobs.map(m=>m.level))+4);
 const s={userId:1,game:{stats:{lvl,currentExp:0},inventory:{gold:1e6,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city,x:.5,y:.5,path:[],moveAt:START,locks:{}}}};
 const chat={game:{},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);return s;
}
for(const [zone,meta]of Object.entries(registry.fields)){
 test(`${zone}: original fixed ground spawns, bounded DTO, saved ownership and physical city return`,()=>{
  const slots=LOCATION_LEVELS[zone].floors[0].rooms.flatMap(r=>r.spawns||[]);
  assert.equal(slots.reduce((n,s)=>n+s.count,0),meta.count);
  for(const slot of slots){const actor={};assert.equal(placeNativeActor(actor,slot),true,`${zone} ${slot.id} ${slot.x},${slot.y},${slot.z}`);
   const point=nativeActorPoint(actor);assert.equal(point.x,slot.x);assert.equal(point.y,slot.y);assert.ok(Math.abs(point.z-slot.z)<300);
   assert.ok(registry.actors[slot.id].runSpeed>0);assert.ok(registry.actors[slot.id].attackRange>0);
  }
  let s=hero(zone);assert.equal(worldAction(s,{action:'walk_location',location:zone},START).ok,true);
  const arrival=s.game.world.walkHome.until+1;advanceWorld(s,arrival);quiet(s,arrival);
  const dto=worldState(s,arrival);assert.equal(dto.nativeField.zone,zone);for(const key of ['x','y','z'])assert.equal(dto.nativeField.point[key],routes.routes[zone].to[key]);
  assert.ok(dto.nativeField.actors.length>0&&dto.nativeField.actors.length<=48);
  const mobs=actors(s),keys=mobs.map(m=>m.sourceRoom+':'+m.sourceSlot);assert.equal(new Set(keys).size,keys.length);
  assert.ok(mobs.every(m=>meta.npcIds.includes(m.mobId)));
  const victim=mobs.find(m=>dto.nativeField.actors.some(a=>a.instanceId===m.instanceId));assert.ok(victim);
  victim.currentHp=Math.floor(victim.hp/2);const saved={id:victim.instanceId,hp:victim.currentHp,position:{...victim.sourcePosition}};
  s=JSON.parse(JSON.stringify(s));quiet(s,arrival);
  assert.equal(worldAction(s,{action:'native_walk_city',city:meta.city},arrival).ok,true);
  const returned=s.game.world.walkHome.until+1;advanceWorld(s,returned);assert.equal(s.game.world.mode,'city');assert.equal(s.game.world.city,meta.city);
  assert.equal(worldAction(s,{action:'walk_location',location:zone},returned+1).ok,true);
  const end=s.game.world.walkHome.until+1;advanceWorld(s,end);quiet(s,end);
  const copies=actors(s).filter(m=>m.instanceId===saved.id);assert.equal(copies.length,1);assert.equal(copies[0].currentHp,saved.hp);assert.deepEqual(copies[0].sourcePosition,saved.position);
  assert.equal(s.game.inventory.gold,1e6);assert.equal(s.game.world.nativeFields?.[zone],undefined,'snapshot is consumed, not retained as a second live field');
  assert.equal(JSON.stringify(worldState(s,end)).includes('sourcePosition'),false);
 });
}
