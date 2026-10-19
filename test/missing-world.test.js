import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WORLD_EXTENSION} from '../template/worldExtension.js';
import {ISHUMA_UNSEAL,ISHUMA_PRODUCTS,GRACIA_NPCS} from '../template/graciaTravel.js';
import {RAID_LOCATIONS} from '../template/raidLocations.js';
import {getCatalog,sourceUnsealDefinition} from '../functions/game/equipment/catalog.js';
import {unsealOptions,unsealArmor} from '../functions/game/equipment/unseal.js';
import {ensureWorld,worldAction,advanceWorld,cityPoint,CITIES,bindWorldInstances,quickCityGold} from '../functions/game/world/world.js';
import {AIRSHIP_SCHEDULE,graciaTownQuote} from '../functions/game/world/graciaTravel.js';
import {regionLinks,regionAccessBlock} from '../functions/game/world/regionAccess.js';
import {enterHuntField} from '../functions/game/hunt/huntFight.js';
import {locationLevel,levelTransitions} from '../functions/game/hunt/locationLevels.js';
import {seedStageCleared,recordSeedKill} from '../functions/game/world/seedInstances.js';
import {locationTravelQuote} from '../functions/game/world/locationTravel.js';
import {enterBossFromAtlas} from '../miniapp/boss.js';
import {worldRows} from '../functions/game/boss/worldBosses.js';
import {locationBossGate} from '../functions/game/world/zakenShip.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import {l2IconUrl} from '../webapp/art/l2-icon-art.js';

const NOW=1800000000000;
function hero(id=1){
 const s={userId:id,game:{stats:{lvl:80,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(s,'humanFighter');updateStats(s);ensureWorld(s,NOW);return s;
}
function party(count,zone='seed-of-destruction'){
 const members=Array.from({length:count},(_,i)=>hero(i+1)),chat={game:{},members};
 for(const [i,s] of members.entries()){
  s.ownerDocument=()=>chat;s.game.party={id:'p'+Math.floor(i/9),leaderId:String(Math.floor(i/9)*9+1)};
  enterHuntField(s,zone,{now:NOW});Object.assign(s.game.world,{city:'keucereus-alliance-base',mode:'location',location:zone});
  Object.assign(s.game.hunt.field,{x:.9,y:.1});
 }
 return {chat,members,a:members[0]};
}
test('all 21 additions keep original anchors and source populations, bounded paintings, and one atlas identity',()=>{
 assert.equal(WORLD_EXTENSION.length,21);
 for(const r of WORLD_EXTENSION){
  assert.ok(r.zone.mobs.length,r.zone.id);assert.ok(r.location.entrySource.file,r.zone.id);
  assert.equal(r.location.selectionGeometry,'authored-extent');
  assert.deepEqual([r.location.x,r.location.y,r.location.z],['x','y','z'].map(k=>Number(r.location.entrySource[k])));
  for(const f of r.levels.floors)for(const suffix of ['','-mobile']){
   const p='webapp/art/world/scenes/'+f.asset+suffix+'-v1.webp';assert.ok(fs.existsSync(p),p);
   assert.ok(fs.statSync(p).size<(suffix?180000:800000));
  }
 }
});
test('Ishuma has every original output, exact adena fee, original icon and proximity enforcement',()=>{
 const s=hero(),npc=GRACIA_NPCS.find(n=>n.service==='ishuma'),city=CITIES.find(c=>c.id===npc.city);
 s.game.world.city=city.id;Object.assign(s.game.world,cityPoint(city,npc));
 s.game.inventory.gold=1e9;s.game.inventory.materials=Object.fromEntries(ISHUMA_UNSEAL.map(r=>['l2_'+r.source,10]));
 assert.equal(ISHUMA_UNSEAL.length,151);assert.equal(unsealOptions(s,'ishuma').length,151);
 for(const row of ISHUMA_UNSEAL){
  const d=sourceUnsealDefinition(row.product),raw=ISHUMA_PRODUCTS[row.product];
  assert.equal(d.name,raw.name);assert.equal(d.lineage.itemId,row.product);assert.equal(d.lineage.pDef,raw.stats.pDef);
  assert.ok(l2IconUrl(d.sourceIcon),d.name);assert.ok(fs.existsSync('webapp'+l2IconUrl(d.sourceIcon)));
  assert.ok(!getCatalog().some(i=>i.id===d.id),'source services do not add shop stock');
 }
 const row=ISHUMA_UNSEAL.find(r=>r.gold>0),id=row.source+':'+row.product,gold=s.game.inventory.gold;
 s.game.inventory.materials={['l2_'+row.source]:10};
 s.game.world.x=0;
 assert.equal(unsealArmor(s,id,'ishuma').reason,'npc_too_far');assert.equal(s.game.inventory.gold,gold);
 Object.assign(s.game.world,cityPoint(city,npc));
 const result=unsealArmor(s,id,'ishuma');assert.equal(result.ok,true);assert.equal(s.game.inventory.gold,gold-row.gold);
 assert.equal(s.game.inventory.ancientAdena,0);assert.equal(result.item.l2Id,row.product);
 assert.equal(s.game.inventory.materials['l2_'+row.source],9);
});
test('Gracian Survivor is 75+, charges its fixed fee once; ferry travels on its server clock and cannot be skipped by express travel',()=>{
 const s=hero();s.game.world.city='giran';s.game.stats.lvl=74;
 assert.equal(graciaTownQuote(s,'gludio-airship-field',NOW),null);
 s.game.stats.lvl=75;const quote=graciaTownQuote(s,'gludio-airship-field',NOW);assert.equal(quote.gold,150000);
 const npc=GRACIA_NPCS.find(n=>n.id===quote.npc);Object.assign(s.game.world,cityPoint(CITIES.find(c=>c.id==='giran'),npc));
 assert.equal(worldAction(s,{action:'travel_city',city:'gludio-airship-field'},NOW).ok,true);
 advanceWorld(s,NOW+1000);assert.equal(s.game.world.city,'gludio-airship-field');assert.equal(s.game.inventory.gold,850000);
 advanceWorld(s,NOW+2000);assert.equal(s.game.inventory.gold,850000);
 const base=CITIES.find(c=>c.id==='keucereus-alliance-base');assert.equal(quickCityGold(s,base,NOW),null);
 const controller=GRACIA_NPCS.find(n=>n.city==='gludio-airship-field'&&n.service==='airship');
 Object.assign(s.game.world,cityPoint(CITIES.find(c=>c.id===controller.city),controller));
 assert.equal(worldAction(s,{action:'travel_city',city:base.id},NOW+3000).ok,true);advanceWorld(s,NOW+4000);
 const trip=s.game.world.walkHome;assert.equal(s.game.world.mode,'road');assert.equal(trip.until-trip.departureAt,AIRSHIP_SCHEDULE.outwardMs);
 advanceWorld(s,trip.until-1);assert.equal(s.game.world.city,'gludio-airship-field');advanceWorld(s,trip.until);
 assert.equal(s.game.world.city,base.id);assert.equal(s.game.inventory.gold,850000);
});
test('Tiat admits one nine-player party without a command channel, rejects missing peers and keeps shared stages after serialization',()=>{
 const short=party(8);
 assert.equal(worldAction(short.a,{action:'floor',floor:2},NOW).reason,'seed_raid_size');
 const oversized=party(10);oversized.members[9].game.party={...oversized.a.game.party};
 assert.equal(worldAction(oversized.a,{action:'floor',floor:2},NOW).reason,'seed_raid_size');
 const {chat,members,a}=party(9);
 assert.equal(worldAction(members[1],{action:'floor',floor:2},NOW).reason,'not_leader');
 assert.equal(worldAction(a,{action:'seed_assembly',seedMode:'tiat'},NOW).reason,'invalid_action');
 members[8].game.hunt.field.x=.1;
 assert.equal(worldAction(a,{action:'floor',floor:2},NOW).reason,'party_not_ready');assert.equal(a.game.hunt.field.floor,1);
 members[8].game.hunt.field.x=.9;
 assert.equal(worldAction(a,{action:'floor',floor:2},NOW).ok,true);
 const instance=chat.game.worldInstances[a.game.world.instanceId];
 assert.equal(instance.members.length,9);assert.equal(instance.until-NOW,130*60000);
 assert.equal(a.game.hunt.field.mobs,members[1].game.hunt.field.mobs);
 const f=a.game.hunt.field,d=levelTransitions('seed-of-destruction',f).destinations.find(d=>d.floor===3);Object.assign(f,{room:d.room,...d.point});
 assert.equal(worldAction(a,{action:'floor',floor:3},NOW).reason,'objectives_remaining');
 const level=locationLevel('seed-of-destruction',2);
 for(const room of level.rooms){let slot=0;for(const spawn of room.spawns)for(let k=0;k<spawn.count;k++,slot++)recordSeedKill(a,{sourceRoom:room.id,sourceSlot:slot},NOW);}
 assert.equal(seedStageCleared(instance,2),true);assert.equal(worldAction(a,{action:'floor',floor:3},NOW).ok,true);
 const saved=JSON.parse(JSON.stringify(instance));assert.deepEqual(saved.defeated,instance.defeated);
 instance.until=NOW;bindWorldInstances(chat,NOW);assert.equal(a.game.world.mode,'location');assert.equal(a.game.hunt.field.floor,1);assert.equal(a.game.world.instanceId,null);
});
test('Infinity requires the source quest and party; branches cannot be reached through adjacent floors',()=>{
 const {a,members}=party(2,'seed-of-infinity');
 assert.equal(worldAction(a,{action:'floor',floor:2},NOW).reason,'seed_quest_required');
 for(const s of members)assert.equal(worldAction(s,{action:'seed_quest',quest:694},NOW).ok,true);
 assert.equal(worldAction(a,{action:'floor',floor:2},NOW).ok,true);
 assert.equal(worldAction(a,{action:'floor',floor:8},NOW).reason,'invalid_floor');
 const id=a.game.world.instanceId;Object.assign(a.game.hunt.field,{x:.1,y:.9});
 assert.equal(worldAction(a,{action:'floor',floor:1},NOW).ok,true);assert.equal(a.game.world.instanceId,null);
 assert.equal(worldAction(a,{action:'floor',floor:2},NOW).ok,true);assert.equal(a.game.world.instanceId,id);
});
test('Hellbound links require the final landing, source stage and pass; Gracia cannot be entered from Aden hunting',()=>{
 const l=WORLD_EXTENSION.find(r=>r.zone.id==='tower-of-infinitum').location,s=hero();
 assert.equal(regionAccessBlock(s,l),'location_path_required');assert.equal(regionAccessBlock(s,l,{linked:true}),'hellbound_stage_required');
 assert.equal(regionLinks('steel-citadel',{floor:1,room:'r2c3',x:.9,y:.1}).length,0);
 assert.equal(regionLinks('steel-citadel',{floor:2,room:'r2c3',x:.9,y:.1})[0].near,true);
 assert.equal(regionAccessBlock(s,WORLD_EXTENSION.find(r=>r.zone.id==='seed-of-annihilation').location),'gracia_route_required');
});
test('active H5 raid revisions replace obsolete names, and Galaxia has a gate on TOI 13',()=>{
 for(const [name,id] of [['Water Spirit Lian',25677],['Gwindorr',25674],['Giant Marpanak',25680],['Queen Shyeed',25671],['Hekaton Prime',25687]])assert.equal(worldRows.find(r=>r.name===name).id,id);
 assert.equal(RAID_LOCATIONS[25450].zone,'tower-of-insolence');assert.equal(RAID_LOCATIONS[25450].gate.floor,13);
 const s=hero();enterHuntField(s,'tower-of-insolence',{now:NOW,floor:13});Object.assign(s.game.world,{mode:'location',location:'tower-of-insolence'});Object.assign(s.game.hunt.field,{x:.5,y:.5});
 assert.equal(locationBossGate(s,RAID_LOCATIONS[25450].name,NOW),true);
 s.game.hunt.field.floor=12;assert.equal(locationBossGate(s,RAID_LOCATIONS[25450].name,NOW),false);
});

test('Anghel has an ordinary walking route without a noblesse token, and original town NPC fees never leak to other keepers',()=>{
 const s=hero(),location=WORLD_EXTENSION.find(r=>r.zone.id==='angel-waterfall').location;
 Object.assign(s.game.world,{city:'aden',x:.5,y:.5});const gold=s.game.inventory.gold;
 assert.equal(regionAccessBlock(s,location),'noblesse_required');
 assert.equal(worldAction(s,{action:'walk_location',location:location.id},NOW).ok,true);
 const until=s.game.world.walkHome.until;advanceWorld(s,until-1);assert.equal(s.game.world.mode,'road');advanceWorld(s,until);
 assert.equal(s.game.world.mode,'location');assert.equal(s.game.world.location,location.id);assert.equal(s.game.inventory.gold,gold);
 const valley=WORLD_EXTENSION.find(r=>r.zone.id==='dragon-valley').location;
 const route=valley.entryRoutes.find(r=>r.type==='NORMAL');assert.ok(route);
 const quote=locationTravelQuote(s,valley,{gateway:true,name:route.npcName},NOW);assert.equal(quote.gold,route.fee);
 assert.equal(locationTravelQuote(s,valley,{gateway:true,name:'Unknown keeper'},NOW),null);
});
test('direct Atlas entry cannot bypass a source instance for a raid copy',async()=>{
 const row=worldRows.find(r=>r.id===25665);assert.ok(row);
 assert.equal((await enterBossFromAtlas(hero(),-123,row.name,NOW)).reason,'instance_npc_required');
});
