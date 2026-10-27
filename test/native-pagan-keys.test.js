import test from 'node:test';import assert from 'node:assert/strict';
import data from '../template/paganKeys.js';import access from '../template/paganAccess.js';
import {worldAction,advanceWorld,worldState} from '../functions/game/world/world.js';
import {enterHuntField} from '../functions/game/hunt/huntFight.js';
import {getZone,getMobDef,buildMob} from '../functions/game/hunt/huntMobs.js';
import {grantKillRewards,huntDropPreview} from '../functions/game/hunt/huntRewards.js';
import {getHuntState} from '../miniapp/hunt.js';
import {activateNativeField,nativeActorPoint,nativeFieldBuckets} from '../functions/game/world/nativeFieldSpace.js';
import {nativeDoorKeyOptions,beginNativeDoorKey} from '../functions/game/world/nativeDoorKeys.js';
import {nativeGroundFor,nativeGroundBlock} from '../functions/game/world/nativeGround.js';
import {nativeDoorStore,nativeOpenDoors} from '../functions/game/world/nativeDoorContext.js';
import {nativeLevelArrival} from '../functions/game/world/nativeLevelTravel.js';
import {worldGeodata} from '../functions/game/world/l2jGeodata.js';
import {nativeSegment} from '../functions/game/world/nativeNavigation.js';
import {createNativeJourney,advanceNativeJourney} from '../functions/game/world/nativeJourney.js';
import change from '../functions/game/player/changePlayerGameClass.js';import update from '../functions/game/player/updatePlayerStats.js';
import fs from 'node:fs';import {createHash} from 'node:crypto';import {ITEM_ICONS} from '../webapp/art/l2-gameplay-icons.js';
const NOW=1800000000000,zone='pagan-temple';
test('each key keeps its own exact source client icon and lossless published assets',()=>{
 const manifest=JSON.parse(fs.readFileSync('art-source/pagan-key-icons.json','utf8'));
 for(const [id,key]of Object.entries(data.keys)){
  assert.equal(ITEM_ICONS['l2_'+id],key.icon.replaceAll('.','-'));assert.equal(manifest.items[id].icon,key.icon);
  for(const asset of Object.values(manifest.items[id].outputs))assert.equal(createHash('sha256').update(fs.readFileSync(asset.path)).digest('hex'),asset.sha256);
 }
});
const actors=s=>nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs||[]);
function quiet(s){for(const m of actors(s))Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:NOW+1e12});}
function hero(){
 const s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1e6,materials:{l2_8067:1,l2_8273:3,l2_8274:3,l2_8275:3},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'location',location:zone,city:'rune',x:.5,y:.5,path:[],moveAt:NOW,locks:{}}}};
 change(s,'humanFighter');update(s);assert.ok(enterHuntField(s,zone,{now:NOW,floor:1}).ok);activateNativeField(s.game.hunt,access.mirrors[32039].to,NOW);advanceWorld(s,NOW);quiet(s);return s;
}
function stand(s,doorId,reach=48){
 const door=data.doors[doorId],allowed=nativeGroundFor(s,NOW);let point;
 for(let i=0;i<32;i++){
  const a=i*Math.PI/16,p=worldGeodata.point({x:Math.trunc(door.point.x+reach*Math.cos(a)),y:Math.trunc(door.point.y+reach*Math.sin(a)),z:door.point.z});
  if(p?.nswe&&allowed(p)){point=p;break;}
 }
 assert.ok(point,'a real standing cell beside source door '+doorId);activateNativeField(s.game.hunt,point,NOW);quiet(s);return point;
}
for(const [itemId,doorId]of [[8273,19160002],[8274,19160010],[8275,19160013]])test(`${itemId}: original static cast, consumed key, shared door deadline, save and source reuse`,async()=>{
 const s=hero();stand(s,doorId,itemId===8274?500:48);const key=data.keys[itemId],before=s.game.inventory.materials['l2_'+itemId];
 if(itemId===8274)assert.equal(nativeDoorKeyOptions(s,NOW).filter(o=>o.itemId===8274&&[19160010,19160011].includes(o.doorId)).length,1,'one action for the source two-leaf gate group');
 assert.ok(worldAction(s,{action:'native_door_key',itemId,doorId},NOW).ok);
 assert.equal(s.game.inventory.materials['l2_'+itemId],before-1);assert.equal(s.game.hunt.field.action.until,NOW+500);
 s.game=JSON.parse(JSON.stringify(s.game));assert.equal((await getHuntState(s,NOW+250)).field.action.name,key.name);
 assert.equal(nativeOpenDoors(nativeDoorStore(s),NOW+499).has(String(doorId)),false);
 advanceWorld(s,NOW+500);quiet(s);assert.equal(nativeOpenDoors(nativeDoorStore(s),NOW+500).has(String(doorId)),true);
 assert.equal(nativeDoorStore(s)[doorId].until,NOW+10500);assert.equal(s.game.world.nativeKeyCooldowns[key.skillId],NOW+3000);
 const retry=key.doorIds.find(id=>id!==doorId);stand(s,retry);assert.equal(beginNativeDoorKey(s,itemId,retry,NOW+501).reason,'cooldown');
 assert.equal(s.game.inventory.materials['l2_'+itemId],before-1);assert.equal(s.game.inventory.gold,1e6);
 assert.equal(nativeOpenDoors(nativeDoorStore(s),NOW+10500).has(String(doorId)),false);
 if(doorId===19160010)assert.equal(nativeOpenDoors(nativeDoorStore(s),NOW+501).has('19160011'),true,'source group opens together');
});
test('door keys reject incompatible IDs, absent key, unknown cast radius and source range overflow before charging',()=>{
 const s=hero();stand(s,19160013);const inventory=JSON.stringify(s.game.inventory);
 assert.equal(beginNativeDoorKey(s,8273,19160013,NOW).reason,'invalid_action');
 assert.equal(beginNativeDoorKey(s,8275,1,NOW).reason,'invalid_action');
 s.game.hunt.field.x+=1;assert.equal(beginNativeDoorKey(s,8275,19160013,NOW).reason,'door_too_far');assert.equal(JSON.stringify(s.game.inventory),inventory);
 stand(s,19160013);s.game.inventory.materials.l2_8275=0;assert.equal(beginNativeDoorKey(s,8275,19160013,NOW).reason,'pagan_key_required');
 s.game.gameClass.stats.name='unknown';assert.equal(beginNativeDoorKey(s,8275,19160013,NOW).reason,'invalid_action');
});
test('a native walk cancels key casting without refund or a late door opening',()=>{
 const s=hero();const point=stand(s,19160013);assert.ok(worldAction(s,{action:'native_door_key',itemId:8275,doorId:19160013},NOW).ok);
 // A real accepted movement command clears the shared pending cast.
 const allowed=nativeGroundFor(s,NOW);let to;
 for(const [dx,dy]of [[16,0],[-16,0],[0,16],[0,-16]])if(nativeSegment(point,{x:point.x+dx,y:point.y+dy,z:point.z},{allowed,reversible:true})){to={x:point.x+dx,y:point.y+dy};break;}
 assert.ok(to);assert.ok(worldAction(s,{action:'native_move',point:to},NOW+100).ok);advanceWorld(s,NOW+1000);
 assert.equal(nativeOpenDoors(nativeDoorStore(s),NOW+1000).has('19160013'),false);assert.equal(s.game.inventory.materials.l2_8275,2);
});
test('source permanent key doors stay open; timed or foreign doors cannot forge permanent records',()=>{
 const s=hero();stand(s,19160016);assert.ok(worldAction(s,{action:'native_door_key',itemId:8275,doorId:19160016},NOW).ok);advanceWorld(s,NOW+500);
 assert.equal(nativeDoorStore(s)[19160016].until,null);assert.ok(nativeOpenDoors(nativeDoorStore(s),NOW+86400000).has('19160016'));
 assert.equal(nativeOpenDoors({'19160002':{openedAt:NOW,until:null},'999':{openedAt:NOW,until:null}},NOW+1).size,0);
});
test('an already-open source target still consumes a cast key and does not extend its door timer',()=>{
 const s=hero();stand(s,19160013);
 assert.ok(worldAction(s,{action:'native_door_key',itemId:8275,doorId:19160013},NOW).ok);advanceWorld(s,NOW+500);quiet(s);
 assert.ok(worldAction(s,{action:'native_door_key',itemId:8275,doorId:19160013},NOW+3000).ok);advanceWorld(s,NOW+3500);
 assert.equal(s.game.inventory.materials.l2_8275,1);assert.equal(nativeDoorStore(s)[19160013].until,NOW+10500);
});
test('a timed door closing behind the current leg does not trap a player already past it',()=>{
 const s=hero(),from={x:-16360,y:-36700,z:-10720},to={x:-16360,y:-37080,z:-10720};
 nativeDoorStore(s)[19160001]={openedAt:NOW,until:NOW+10000};
 const trip=createNativeJourney(from,[to],{now:NOW,speed:100,allowed:nativeGroundFor(s,NOW)});assert.ok(trip);
 assert.equal(advanceNativeJourney(trip,NOW+3000,100,{allowed:nativeGroundFor(s,NOW+3000)}),false);
 assert.ok(trip.native.point.y< -36900);assert.equal(advanceNativeJourney(trip,NOW+11000,100,{allowed:nativeGroundFor(s,NOW+11000)}),true);assert.deepEqual(trip.native.point,to);
 const forged=createNativeJourney(from,[to],{now:NOW,speed:100,allowed:nativeGroundFor(s,NOW)});forged.native.point={x:from.x+300,y:to.y-100,z:from.z};
 assert.equal(advanceNativeJourney(forged,NOW+11000,100,{allowed:nativeGroundFor(s,NOW+11000)}),false);assert.equal(forged.native.blocked,'path_blocked');
});
for(const [npcId,drop]of Object.entries(data.scriptDrops))test(`${npcId}: original key script pays one unscaled key to the killer and preview stays at 10%`,()=>{
 const s=hero(),definition=getMobDef(getZone(zone),npcId),key='l2_'+drop.itemId;
 assert.ok(definition);assert.equal(huntDropPreview(85,definition,'red',s).find(r=>r.key===key).chance,10);
 for(const [roll,expected]of [[.099,1],[.1,0]]){
  const before=s.game.inventory.materials[key],mob=buildMob(getZone(zone),definition,{now:NOW,random:()=>.5,champion:'red',className:'humanFighter'});
  const rewards=grantKillRewards(s,mob,definition,{now:NOW,random:()=>roll});
  assert.equal(s.game.inventory.materials[key]-before,expected);assert.equal(rewards.items.filter(i=>i.item===key).reduce((n,r)=>n+r.amount,0),expected);
 }
});

test('walk from the source mirror through both guarded gates and a Darkness-key door to the real ritual floor',()=>{
 let s=hero(),now=NOW;const victim=actors(s)[0];assert.ok(victim);victim.currentHp=2;const saved=victim.instanceId,opened=[];
 function follow(){
  let ticks=0;
  while(s.game.hunt.field.native.journey){
   assert.ok(++ticks<1000,'bounded actual walking time');now+=1000;quiet(s);advanceWorld(s,now);quiet(s);
   assert.equal(s.game.world.mode,'location');assert.equal(s.game.hunt.zone,zone);
  }
 }
 function guide(npcId){
  const result=worldAction(s,{action:'native_guide',npcId},now);
  assert.ok(result.ok||result.reason==='npc_already_near',JSON.stringify({npcId,point:nativeActorPoint(s.game.hunt.field),gate:s.game.hunt.field.native.gatedWalk,result}));if(result.ok)follow();
 }
 const destination=nativeLevelArrival(zone,2);assert.ok(destination);
 for(let gates=0;gates<8;gates++){
  const at=nativeActorPoint(s.game.hunt.field);if(Math.hypot(at.x-destination.x,at.y-destination.y,at.z-destination.z)<=16)break;
  const result=worldAction(s,{action:'native_floor',floor:2},now);assert.ok(result.ok,JSON.stringify(result));follow();
  const gate=s.game.hunt.field.native.gatedWalk;
  const reached=nativeActorPoint(s.game.hunt.field);if(Math.hypot(reached.x-destination.x,reached.y-destination.y,reached.z-destination.z)<=16)break;
  assert.ok(gate?.closedDoors?.length,'stop at an actual source door');
  assert.equal(worldAction(s,{action:'native_floor',floor:2},now).reason,'door_closed','repeating a blocked walk must not loop back through the halls');
  const door=Number(gate.closedDoors[0]);opened.push(door);
  if(door===19160001||door===19160010||door===19160011){
   const npcId=door===19160001?32034:32036;guide(npcId);
   assert.ok(worldAction(s,{action:'native_floor',floor:s.game.hunt.field.native.sourceFloor,routeId:`${npcId}:SCRIPT:0`},now).ok);
  }else{
   assert.ok([19160012,19160013].includes(door),'only the pinned secret door can require Darkness here');
   let cast=worldAction(s,{action:'native_door_key',itemId:8275,doorId:door},now);
   if(cast.reason==='door_too_far'){assert.ok(worldAction(s,{action:'native_door_guide',itemId:8275,doorId:door},now).ok);follow();cast=worldAction(s,{action:'native_door_key',itemId:8275,doorId:door},now);}
   assert.ok(cast.ok,JSON.stringify(cast));now+=500;advanceWorld(s,now);quiet(s);
  }
  s.game=JSON.parse(JSON.stringify(s.game));
 }
 const point=nativeActorPoint(s.game.hunt.field);assert.ok(Math.hypot(point.x-destination.x,point.y-destination.y,point.z-destination.z)<=16,JSON.stringify({point,destination,opened}));
 assert.ok(opened.includes(19160001));assert.ok(opened.includes(19160010)||opened.includes(19160011));assert.ok(opened.includes(19160013));
 assert.equal(s.game.hunt.field.native.sourceFloor,2);assert.equal(s.game.inventory.materials.l2_8067,1);assert.equal(s.game.inventory.materials.l2_8275,2);assert.equal(s.game.inventory.gold,1e6);
 assert.equal(actors(s).filter(m=>m.instanceId===saved).length,1);assert.equal(actors(s).find(m=>m.instanceId===saved).currentHp,2);
});
