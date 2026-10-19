import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LOCATION_LEVELS,LEVEL_SOURCE,ZAKEN_SHIP} from '../template/locationLevels.js';
import {locationLevel,levelTransitions} from '../functions/game/hunt/locationLevels.js';
import {enterHuntField,changeHuntFloor,ensureHunt,advanceHunt,moveHuntField} from '../functions/game/hunt/huntFight.js';
import {roomLayout,adjacent} from '../functions/game/hunt/huntRooms.js';
import {getZone} from '../functions/game/hunt/huntMobs.js';
import {CITIES,CITY_NPCS,cityPoint,worldAction,ensureWorld,enterZakenShip,bindWorldInstances} from '../functions/game/world/world.js';
import {candleRoom,shipDto,locationBossGate,tickShip} from '../functions/game/world/zakenShip.js';
import {grantKillRewards} from '../functions/game/hunt/huntRewards.js';
import {getHuntState} from '../miniapp/hunt.js';
import {roomSceneUrl} from '../webapp/room-scene-art.js';
import {visibleFieldMobs} from '../webapp/hunt-visible-actors.js';
import {loadBossEntryState} from '../webapp/boss.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';

const NOW=1800000000000;
function hero(id=1,zone='tower-of-insolence',floor){
 const s={userId:id,game:{stats:{lvl:80,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(s,'humanFighter');updateStats(s);ensureWorld(s,NOW);
 assert.equal(enterHuntField(s,zone,{now:NOW,random:()=>.5,floor}).ok,true);
 Object.assign(s.game.world,{mode:'location',location:zone});quiet(s);
 return s;
}
function quiet(s){s.game.hunt.field.mobs.forEach(m=>{m.aggressive=false;m.aggro=false;m.nextAttackAt=NOW+1e9;});}
function walk(s,to,now=NOW){
 const f=s.game.hunt.field;quiet(s);
 assert.equal(moveHuntField(s,'room:'+to,now,()=>.5).ok,true);
 advanceHunt(s,now+30000,()=>.5);quiet(s);assert.equal(f.room,to);
}
function shipGroup(random=()=>0){
 const a=hero(1,'devils-isle',3),b=hero(2,'devils-isle',3),chat={game:{},members:[a,b]};
 for(const s of chat.members){
  s.ownerDocument=()=>chat;s.game.party={id:'crew',leaderId:'1'};
  const f=s.game.hunt.field,d=levelTransitions('devils-isle',f).destinations.find(d=>d.floor===4);
  f.rooms[f.room]={mobs:f.mobs};Object.assign(f,{room:d.room,...d.point,mobs:[],target:null});s.game.hunt.mob=null;
 }
 assert.equal(enterZakenShip(a,NOW,random).ok,true);
 return {a,b,chat,instance:chat.game.worldInstances[a.game.world.instanceId]};
}
function approachCandle(s,id,now){
 const number=candleRoom(id),floor=4+Math.floor((number-1)/5),f=s.game.hunt.field;
 if(f.floor!==floor)assert.equal(changeHuntFloor(s,floor,{now}).ok,true);
 const room=locationLevel('devils-isle',floor).rooms.find(r=>r.sourceRoom===number);
 Object.assign(f,{room:room.id,mobs:[],target:null});
 const c=shipDto(s,now).candles.find(c=>c.id===id);Object.assign(f,{x:c.x,y:c.y});
}

test('all configured floors have source-only populations, connected rooms and separate bounded paintings',()=>{
 assert.equal(LEVEL_SOURCE.geodataAvailable,false);
 assert.deepEqual(Object.fromEntries(Object.entries(LOCATION_LEVELS).filter(([id])=>['tower-of-insolence','cruma-tower','ivory-tower','garden-of-eva','giants-cave','monastery-of-silence','imperial-tomb','pagan-temple','devils-isle'].includes(id)).map(([id,z])=>[id,z.floors.length])),{'tower-of-insolence':14,'cruma-tower':3,'ivory-tower':6,'garden-of-eva':5,'giants-cave':2,'monastery-of-silence':2,'imperial-tomb':2,'pagan-temple':4,'devils-isle':6});
 for(const [id,z] of Object.entries(LOCATION_LEVELS))for(const floor of z.floors){
  const s=hero(1,id,floor.number),layout=roomLayout(getZone(id),floor.number);
  const reached=new Set([layout.startId]);let count=-1;
  while(count!==reached.size){count=reached.size;for(const r of layout.rooms)if(layout.rooms.some(a=>reached.has(a.id)&&adjacent(a,r)))reached.add(r.id);}
  assert.equal(reached.size,layout.rooms.length,id+':'+floor.number);
  assert.equal(s.game.hunt.field.mobs.length,floor.rooms[0].cap);
  for(const mob of s.game.hunt.field.mobs){assert.ok(floor.rooms[0].mobIds.includes(mob.mobId));assert.ok(mob.sourcePosition||mob.sourceTerritory);}
  for(const compact of [true,false]){
   const url=roomSceneUrl(floor.environment,{sceneKey:`${id}:${layout.startId}:floor-${floor.number}`,compact});
   assert.ok(url.includes(floor.asset+'-'),url);assert.ok(fs.existsSync('webapp'+url),url);
   assert.ok(fs.statSync('webapp'+url).size<(compact?180000:800000));
  }
 }
 assert.notDeepEqual(locationLevel('tower-of-insolence',1).rooms.flatMap(r=>r.mobIds),locationLevel('tower-of-insolence',12).rooms.flatMap(r=>r.mobIds));
 assert.deepEqual(ZAKEN_SHIP.rooms.map(r=>r[2]).filter((v,i,a)=>a.indexOf(v)===i),[-3498,-3226,-2954]);
});

test('stairs enforce adjacency and actual room; banks retain health, kills, pending respawns and visited rooms after save/load',async()=>{
 let s=hero(),f=s.game.hunt.field;
 const first=f.mobs[0];first.currentHp=37;const ids=f.mobs.map(m=>m.instanceId);
 f.respawns.push({at:NOW+600000,room:f.room,sourceSlot:0});
 assert.equal(worldAction(s,{action:'floor',floor:3},NOW).reason,'invalid_floor');
 Object.assign(f,{x:.9,y:.1});assert.equal(worldAction(s,{action:'floor',floor:2},NOW).reason,'stairs_required');
 for(const [i,room] of ['r0c1','r0c2','r0c3','r1c3','r2c3'].entries())walk(s,room,NOW+i*40000);
 Object.assign(f,{x:.9,y:.1});assert.equal(worldAction(s,{action:'floor',floor:2},NOW+220000).ok,true);
 assert.equal(f.room,'r0c0');assert.equal(f.floorStates[1].rooms.r0c0.mobs[0].currentHp,37);
 s=JSON.parse(JSON.stringify(s));f=s.game.hunt.field;quiet(s);
 assert.equal(worldAction(s,{action:'floor',floor:1},NOW+220001).ok,true);
 assert.equal(f.room,'r2c3');assert.equal(f.respawns.length,1);
 for(const [i,room] of ['r1c3','r0c3','r0c2','r0c1','r0c0'].entries())walk(s,room,NOW+230000+i*40000);
 assert.deepEqual(f.mobs.map(m=>m.instanceId),ids);assert.equal(f.mobs[0].currentHp,37);
 assert.equal(f.visited.length,6);assert.match((await getHuntState(s,NOW+420000)).field.sceneKey,/:floor-1$/);
});

test('source respawns preserve NPC slot and delay; source territory is never presented as a point',()=>{
 const s=hero(),f=s.game.hunt.field,m=f.mobs.shift();
 f.respawns=[{at:NOW+1000,room:f.room,sourceSlot:m.sourceSlot}];
 advanceHunt(s,NOW+999,()=>.5);assert.equal(f.mobs.some(x=>x.sourceSlot===m.sourceSlot),false);
 advanceHunt(s,NOW+1000,()=>.5);const fresh=f.mobs.find(x=>x.sourceSlot===m.sourceSlot);
 assert.equal(fresh.mobId,m.mobId);assert.equal(fresh.sourceRespawnMs,m.sourceRespawnMs);
 assert.equal(fresh.sourcePosition,null);assert.ok(fresh.sourceTerritory.polygon.length>=3);
});

test('Ivory Tower enters the lobby, keeps peaceful guild halls, and uses source NPC transports and prices',()=>{
 const s=hero(1,'ivory-tower'),f=s.game.hunt.field;
 assert.equal(f.floor,3);assert.equal(f.mobs.length,0);
 const d=levelTransitions('ivory-tower',f).destinations.find(d=>d.floor===6);
 assert.equal(d.gold,0);assert.equal(d.mode,'teleport');assert.equal(d.npc,'30727');
 assert.equal(worldAction(s,{action:'floor',floor:6},NOW).reason,'stairs_required');
 Object.assign(f,d.point);const gold=s.game.inventory.gold;
 assert.equal(worldAction(s,{action:'floor',floor:6},NOW).ok,true);assert.equal(s.game.inventory.gold,gold);
 assert.ok(locationLevel('ivory-tower',6).npcs.some(n=>n.name==='Ladd'));
 assert.equal(f.mobs.length,0);
});

test('legacy fields migrate once without rewards and quest entry selects the real floor and room',()=>{
 const s=hero(),f=s.game.hunt.field,m=f.mobs[0],gold=s.game.inventory.gold;m.currentHp=17;delete f.levelVersion;
 ensureHunt(s);assert.equal(f.levelVersion,1);assert.equal(f.mobs.find(x=>x.instanceId===m.instanceId).currentHp,17);
 assert.equal(s.game.inventory.gold,gold);const ids=f.mobs.map(m=>m.instanceId);ensureHunt(s);assert.deepEqual(f.mobs.map(m=>m.instanceId),ids);
 const target=locationLevel('tower-of-insolence',12).rooms.flatMap(r=>r.mobIds)[0];s.game.hunt.field=null;s.game.hunt.mob=null;
 assert.equal(enterHuntField(s,'tower-of-insolence',{now:NOW,targetMobId:target}).ok,true);
 assert.ok(locationLevel('tower-of-insolence',s.game.hunt.field.floor).rooms.find(r=>r.id===s.game.hunt.field.room).mobIds.includes(target));
});

test('Zaken route requires the assembled group and shares candles without leaking the hidden room',()=>{
 const {a,b,chat,instance}=shipGroup();
 assert.equal(a.game.hunt.field.mobs,b.game.hunt.field.mobs);
 assert.equal(ZAKEN_SHIP.candles.length,36);assert.equal(ZAKEN_SHIP.rooms.length,15);
 assert.equal(locationBossGate(a,'zaken',NOW),false);assert.equal(shipDto(a,NOW).boss,null);
 assert.equal('secretRoom' in shipDto(a,NOW),false);
 const red=Array.from({length:36},(_,i)=>i+1).find(n=>!ZAKEN_SHIP.rooms[0].slice(3).includes(n));
 assert.equal(worldAction(a,{action:'ship_candle',candle:99},NOW).reason,'ship_required');
 approachCandle(a,red,NOW);assert.equal(worldAction(a,{action:'ship_candle',candle:red},NOW).ok,true);
 assert.equal(worldAction(a,{action:'ship_candle',candle:red},NOW).reason,'candle_already_lit');
 bindWorldInstances(chat,NOW+3499);assert.equal(Object.values(instance.rooms).flatMap(r=>r.mobs).length,0);
 bindWorldInstances(chat,NOW+3500);const mobs=Object.values(instance.rooms).flatMap(r=>r.mobs);
 assert.deepEqual(mobs.map(m=>m.mobId),ZAKEN_SHIP.ordinaryNpcIds);assert.ok(mobs.every(m=>m.rewardless));
 const before=JSON.stringify(a.game.inventory);assert.equal(grantKillRewards(a,mobs[0],ZAKEN_SHIP.mobs[0],{now:NOW}).exp,0);assert.equal(JSON.stringify(a.game.inventory),before);
 tickShip(instance,NOW+9000);assert.equal(Object.values(instance.rooms).flatMap(r=>r.mobs).length,4);
});

test('ship entry rejects an absent crew member, a nonleader, remote candles and outsiders without mutating entry state',()=>{
 const {a,b,chat,instance}=shipGroup();
 Object.assign(a.game.hunt.field,{x:.02,y:.02});
 assert.equal(worldAction(a,{action:'ship_candle',candle:1},NOW).reason,'candle_too_far');assert.deepEqual(instance.candles,{});
 const stranger=hero(3,'devils-isle',4);stranger.ownerDocument=()=>chat;stranger.game.world.instanceId=instance.id;
 assert.equal(shipDto(stranger,NOW),null);assert.equal(worldAction(stranger,{action:'ship_candle',candle:1},NOW).reason,'ship_required');
 for(const s of [a,b]){
  changeHuntFloor(s,3,{now:NOW});s.game.world.instanceId=null;const d=levelTransitions('devils-isle',s.game.hunt.field).destinations.find(d=>d.floor===4);
  Object.assign(s.game.hunt.field,{room:d.room,...d.point,mobs:[],target:null});quiet(s);
 }
 assert.equal(enterZakenShip(b,NOW+1).reason,'instance_party_required');
 b.game.hunt.field.x=.5;
 assert.equal(enterZakenShip(a,NOW+1).reason,'party_not_ready');assert.equal(a.game.hunt.field.floor,3);assert.equal(a.game.world.instanceId,null);
});

test('four blue candles reveal Zaken once after the original delay; deck changes preserve shared room state and expiry revokes entry',()=>{
 const {a,b,chat,instance}=shipGroup(()=>.99),blue=ZAKEN_SHIP.rooms[14].slice(3);
 for(const id of blue){approachCandle(a,id,NOW);assert.equal(worldAction(a,{action:'ship_candle',candle:id},NOW).ok,true);}
 bindWorldInstances(chat,NOW+5499);assert.equal(instance.revealed,false);
 bindWorldInstances(chat,NOW+5500);assert.equal(instance.revealed,true);
 const number=15,room=locationLevel('devils-isle',6).rooms.find(r=>r.sourceRoom===number);
 Object.assign(a.game.hunt.field,{room:room.id,x:.5,y:.5});bindWorldInstances(chat,NOW+5500);
 assert.equal(locationBossGate(a,'zaken',NOW+5500),true);assert.equal(a.game.hunt.field.mobs.length,3);
 const mob=a.game.hunt.field.mobs[0];mob.currentHp=19;
 changeHuntFloor(a,5,{now:NOW+5501});bindWorldInstances(chat,NOW+5501);
 changeHuntFloor(a,6,{now:NOW+5502});Object.assign(a.game.hunt.field,{room:room.id});bindWorldInstances(chat,NOW+5502);
 assert.equal(a.game.hunt.field.mobs[0].currentHp,19);
 bindWorldInstances(chat,NOW+6000);assert.equal(Object.values(instance.rooms).flatMap(r=>r.mobs).length,3);
 bindWorldInstances(chat,instance.until);assert.equal(a.game.world.mode,'city');assert.equal(b.game.world.mode,'city');assert.equal(locationBossGate(a,'zaken',instance.until),false);
});

test('location boss gates require the right floor, room and proximity; Atlas entry payload remains unchanged',async()=>{
 const s=hero(1,'cruma-tower',2);assert.equal(locationBossGate(s,'core',NOW),false);
 changeHuntFloor(s,3,{now:NOW});Object.assign(s.game.hunt.field,{x:.5,y:.5});assert.equal(locationBossGate(s,'core',NOW),true);
 assert.equal(locationBossGate(s,'baium',NOW),false);s.game.hunt.field.x=.1;assert.equal(locationBossGate(s,'core',NOW),false);
 const calls=[];await loadBossEntryState(async(p,o)=>calls.push(JSON.parse(o.body)),{destination:'zaken',fromLocation:true});
 await loadBossEntryState(async(p,o)=>calls.push(JSON.parse(o.body)),{destination:'zaken'});
 assert.deepEqual(calls,[{epic:'zaken',teleport:true,fromLocation:true},{epic:'zaken',teleport:true}]);
});

test('dense populations bound DOM actors while keeping the selected target reachable',()=>{
 const mobs=Array.from({length:90},(_,i)=>({instanceId:String(i),x:i/100,y:0}));
 const visible=visibleFieldMobs({mobs,x:0,y:0,target:'89'});
 assert.equal(visible.length,24);assert.equal(visible[0].instanceId,'89');assert.equal(mobs.length,90);
});


test('Rune church drop is one-way and Triol mirrors retain their H5 destinations',()=>{
 const s=hero(1,'pagan-temple',1),npc=CITY_NPCS.find(n=>n.service==='pagan-church');
 s.game.hunt=null;Object.assign(s.game.world,{mode:'city',city:'rune',location:null,x:0,y:0});
 assert.equal(worldAction(s,{action:'pagan_church'},NOW).reason,'npc_too_far');
 Object.assign(s.game.world,cityPoint(CITIES.find(c=>c.id==='rune'),npc));
 assert.equal(worldAction(s,{action:'pagan_church'},NOW).ok,true);
 assert.equal(s.game.hunt.field.floor,3);
 const take=(floor)=>{quiet(s);const f=s.game.hunt.field,d=levelTransitions('pagan-temple',f).destinations.find(d=>d.floor===floor);assert.ok(d);Object.assign(f,{room:d.room,...d.point});assert.equal(worldAction(s,{action:'floor',floor},NOW).ok,true);};
 take(4);assert.equal(levelTransitions('pagan-temple',s.game.hunt.field).destinations.some(d=>d.floor===3),false);
 take(1);assert.equal(locationLevel('pagan-temple',4).transports[0].source.z,-10856);
 take(3);assert.equal(locationLevel('pagan-temple',1).transports.find(d=>d.floor===3).source.z,718);
 assert.equal(locationLevel('pagan-temple',3).transports[0].sourcePosition,null);
});
