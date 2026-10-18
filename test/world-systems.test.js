import holdings from '../template/worldHoldings.js';
import {arriveHoldingEntrance} from '../functions/game/world/holdingEntry.js';
import {townTravelQuote} from '../functions/game/world/townTravel.js';
import test from 'node:test';
import {loadWorldInstances,saveWorldInstances} from '../miniapp/worldInstances.js';
import assert from 'node:assert/strict';
import {findPath,advancePath,pointInPolygon} from '../functions/game/world/navigation.js';
import {worldAction,worldState,ensureWorld,advanceWorld,enterWorldInstance,bindWorldInstances,CITIES,CITY_NPCS,LOCATIONS,cityPoint} from '../functions/game/world/world.js';
import {siegeAction,settleSiege,SIEGE_RULES} from '../functions/game/world/siege.js';
import {worldShopAction} from '../functions/game/world/shops.js';
import {enchantL2Skill,enchantOffer} from '../functions/game/player/l2SkillEnchant.js';
import {enterHuntField,advanceHunt,moveHuntField} from '../functions/game/hunt/huntFight.js';
import {getHuntState} from '../miniapp/hunt.js';
import {addAttribute,attributeProfile,elementalFactor} from '../functions/game/equipment/attributes.js';
import {equippedPvpEffects,l2RawStat,l2OnDamageDealt} from '../functions/game/player/l2Effects.js';
import changePlayerGameClass from '../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000;
test('approaching an NPC walks to the selected target and retains the destination after a city transfer',()=>{
 const s=hero();s.game.world.city='giran';
 const local=CITY_NPCS.find(n=>n.city==='giran'&&n.gateway);
 assert.equal(worldAction(s,{action:'approach_npc',npc:local.id},NOW).ok,true);
 assert.ok(s.game.world.path.length);
 advanceWorld(s,NOW+200000);
 assert.deepEqual({x:s.game.world.x,y:s.game.world.y},cityPoint(CITIES.find(c=>c.id==='giran'),local));
 const remote=CITY_NPCS.find(n=>n.city==='gludio'&&!n.gateway);
 const before=s.game.inventory.gold,quote=townTravelQuote(s,remote.city,NOW+200001);
 assert.equal(worldAction(s,{action:'approach_npc',npc:remote.id},NOW+200001).ok,true);
 advanceWorld(s,NOW+400000);
 assert.equal(s.game.world.city,'gludio');assert.equal(s.game.inventory.gold,before-quote.gold);
 assert.ok(s.game.world.path.length);
 advanceWorld(s,NOW+600000);
 assert.deepEqual({x:s.game.world.x,y:s.game.world.y},cityPoint(CITIES.find(c=>c.id==='gludio'),remote));
 s.game.world.mode='location';
 assert.equal(worldAction(s,{action:'approach_npc',npc:remote.id},NOW+600001).reason,'return_to_city');
});
test('converted PvP passives preserve SA without doubling it, and CP proc observes static reuse',()=>{
 const a=hero(1),b=hero(2);a.game.equipmentStats.weapon={isFilled:true,pvp:{skills:[{id:3566,level:1},{id:3650,level:1}]}};
 assert.equal(l2RawStat(a,'critRate'),0);assert.equal(l2RawStat(a,'pvpPhysSkillsDmg',true),1.05);
 assert.equal(equippedPvpEffects(a).length,2);a.game.gameClass.stats.maxCp=1000;a.game.gameClass.stats.cp=0;
 l2OnDamageDealt(a,b,100,NOW,()=>0);assert.equal(a.game.gameClass.stats.cp,200);
 l2OnDamageDealt(a,b,100,NOW+1,()=>0);assert.equal(a.game.gameClass.stats.cp,200);
 l2OnDamageDealt(a,b,100,NOW+10000,()=>0);assert.equal(a.game.gameClass.stats.cp,400);
});
test('scroll cancels a pending room transition and hall movement advances on state polling',()=>{
 const s=hero();enterHuntField(s,'plains-of-dion',{now:NOW});Object.assign(s.game.world,{mode:'location',location:'plains-of-dion'});
 const f=s.game.hunt.field;f.mobs.forEach(m=>{m.aggressive=false;m.aggro=false;});f.pendingRoom='r0c1';f.path=[{x:.8,y:.8}];
 assert.equal(worldAction(s,{action:'escape'},NOW).ok,true);assert.equal(f.pendingRoom,undefined);assert.equal(f.path.length,0);
 Object.assign(s.game.world,{mode:'hall',channel:null,x:.1,y:.1,path:[{x:.9,y:.1}],moveAt:NOW});
 worldState(s,NOW+1000);assert.ok(s.game.world.x>.1);assert.ok(s.game.world.x<.9);
});
function hero(id=0,level=80){const s={userId:id,userChatData:{user:{id}},game:{stats:{lvl:level,currentExp:0},inventory:{gold:10000000,sp:1e9,moonDew:1e6,ironOre:1e6,materials:{scroll_escape:2},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};changePlayerGameClass(s,'warrior');updatePlayerStats(s);ensureWorld(s,NOW);return s;}
test('A* rejects obstacles and invalid points, and advances only by elapsed running time',()=>{const actor={x:.1,y:.5,path:[],moveAt:NOW},wall={x:.4,y:.25,w:.2,h:.5};assert.equal(findPath(actor,{x:.5,y:.5},[wall]),null);assert.equal(findPath(actor,{x:NaN,y:0}),null);actor.path=findPath(actor,{x:.9,y:.5},[wall]);assert.ok(actor.path.length);assert.ok(actor.path.every(p=>!(p.x>=.4&&p.x<=.6&&p.y>=.25&&p.y<=.75)));advancePath(actor,NOW,100);assert.equal(actor.x,.1);advancePath(actor,NOW+1000,100);assert.ok(actor.x<.2);advancePath(actor,NOW+60000,100);assert.equal(actor.x,.9);assert.equal(actor.path.length,0);assert.equal(pointInPolygon({x:1,y:1},[[0,0],[2,0],[2,2],[0,2]]),true);});
test('viewing the atlas is peaceful; paid teleport charges once after reaching the gatekeeper',()=>{const s=hero(),l=LOCATIONS.find(l=>!l.instance&&l.region==='giran');const before=s.game.inventory.gold;worldState(s,NOW);assert.equal(s.game.world.mode,'city');assert.equal(worldAction(s,{action:'travel',location:l.id},NOW).ok,true);assert.equal(s.game.inventory.gold,before);advanceWorld(s,NOW);assert.equal(s.game.world.mode,'city');advanceWorld(s,NOW+300000);assert.equal(s.game.world.mode,'location');assert.equal(s.game.inventory.gold,before-l.teleportGold);advanceWorld(s,NOW+300001);assert.equal(s.game.inventory.gold,before-l.teleportGold);});
test('escape consumes one scroll after 15 seconds, is interrupted by movement and damage',()=>{const s=hero();enterHuntField(s,'plains-of-dion',{now:NOW});Object.assign(s.game.world,{mode:'location',location:'plains-of-dion'});s.game.hunt.field.mobs.forEach(m=>m.aggressive=false);assert.equal(worldAction(s,{action:'escape'},NOW).ok,true);advanceWorld(s,NOW+14999);assert.equal(s.game.world.mode,'location');advanceWorld(s,NOW+15000);assert.equal(s.game.world.mode,'city');assert.equal(s.game.inventory.materials.scroll_escape,1);enterHuntField(s,'plains-of-dion',{now:NOW+20000});Object.assign(s.game.world,{mode:'location',location:'plains-of-dion'});s.game.hunt.field.mobs.forEach(m=>m.aggressive=false);worldAction(s,{action:'escape'},NOW+20000);worldAction(s,{action:'move',point:{x:.5,y:.8}},NOW+20001);assert.equal(s.game.world.channel,null);assert.equal(s.game.inventory.materials.scroll_escape,1);worldAction(s,{action:'escape'},NOW+20002);s.game.gameClass.stats.hp--;advanceWorld(s,NOW+20003);assert.equal(s.game.world.channel,null);});
test('floor transitions require stairs in the correct room and retain floor banks',async()=>{
 const s=hero();enterHuntField(s,'tower-of-insolence',{now:NOW});Object.assign(s.game.world,{mode:'location',location:'tower-of-insolence'});
 const f=s.game.hunt.field;f.mobs.forEach(m=>m.aggressive=false);
 assert.equal(worldAction(s,{action:'floor',floor:2},NOW).reason,'stairs_required');
 const ids=f.mobs.map(m=>m.instanceId);f.rooms.r0c0={mobs:f.mobs};Object.assign(f,{room:'r2c3',mobs:[],x:.9,y:.1});
 assert.equal(worldAction(s,{action:'floor',floor:2},NOW).ok,true);
 assert.equal(worldAction(s,{action:'floor',floor:1},NOW).ok,true);
 assert.deepEqual(f.rooms.r0c0.mobs.map(m=>m.instanceId),ids);
 const dto=await getHuntState(s,NOW);assert.equal(dto.field.floor,1);assert.equal(dto.field.floors,14);assert.ok(dto.field.runSpeed>0);
});
test('instance entry validates the whole party before consuming resources and shares monsters',()=>{const a=hero(1,23),b=hero(2,23),l=LOCATIONS.find(l=>l.id==='kamaloka-23'),npc=CITY_NPCS.find(n=>n.id===l.npc),c=CITIES.find(c=>c.id===npc.city),point=cityPoint(c,npc),chat={game:{},members:[a,b]};for(const m of chat.members){m.game.party={id:'p',leaderId:'1'};Object.assign(m.game.world,{city:c.id,...point});m.ownerDocument=()=>chat;}assert.equal(enterWorldInstance(chat,a,l.id,NOW).ok,true);assert.equal(a.game.world.instanceId,b.game.world.instanceId);assert.equal(a.game.hunt.field.mobs,b.game.hunt.field.mobs);assert.equal(a.game.world.locks.kamaloka>b.game.world.moveAt,true);chat.game.worldInstances[a.game.world.instanceId].until=NOW+1;bindWorldInstances(chat,NOW+2);assert.equal(a.game.world.mode,'city');assert.equal(b.game.world.mode,'city');});
test('Rift moves a party into the same next room on its clock',()=>{const a=hero(1,40),b=hero(2,40),l=LOCATIONS.find(l=>l.id==='rift-1'),npc=CITY_NPCS.find(n=>n.id===l.npc),c=CITIES.find(c=>c.id===npc.city),chat={game:{},members:[a,b]};for(const m of chat.members){m.game.stats.lvl=l.levelMin;m.game.party={id:'p',leaderId:'1'};Object.assign(m.game.world,{city:c.id,...cityPoint(c,npc)});m.game.inventory.materials.l2_7079=100;m.ownerDocument=()=>chat;}assert.equal(enterWorldInstance(chat,a,l.id,NOW).ok,true);const room=a.game.hunt.field.room;bindWorldInstances(chat,NOW+300001);assert.notEqual(a.game.hunt.field.room,room);assert.equal(a.game.hunt.field.mobs,b.game.hunt.field.mobs);assert.equal(a.game.inventory.materials.l2_7079,100-l.instance.fragments);});
test('fort capture requires registration, physical arrival, objectives and a timed leader channel',()=>{const s=hero(1),clan={_id:'c',name:'Clan',owner:1,level:5},h=holdings.find(h=>h.kind==='fort'),r={};assert.equal(siegeAction(r,h,s,clan,{action:'siege_register'},NOW).ok,true);const start=NOW+SIEGE_RULES.fort.waitMs;assert.equal(siegeAction(r,h,s,clan,{action:'siege_enter'},start).reason,'holding_region_required');s.game.world.readyHolding=h.id;assert.equal(siegeAction(r,h,s,clan,{action:'siege_enter'},start).reason,'holding_region_required');arriveHoldingEntrance(s,h,start);assert.equal(siegeAction(r,h,s,clan,{action:'siege_enter'},start).ok,true);const p=r.siege.players['1'];Object.assign(p,{x:.5,y:.12,leader:true});assert.equal(siegeAction(r,h,s,clan,{action:'siege_capture'},start).reason,'objectives_remaining');r.siege.objectives.filter(o=>o.id!=='artifact').forEach(o=>o.hp=0);assert.equal(siegeAction(r,h,s,clan,{action:'siege_capture'},start).ok,true);siegeAction(r,h,s,clan,{action:'siege_tick'},start+60000);settleSiege(r,start+60000);assert.equal(r.siege.winner.clanId,'c');settleSiege(r,r.siege.endsAt);assert.equal(r.owner.clanId,'c');});
test('Mastery purchase validates funds before mutation; safe failure preserves a skill and consumes its book',()=>{const s=hero();s.game.inventory.materials.l2_9912=1799;const gold=s.game.inventory.gold;assert.equal(worldShopAction(s,{action:'shop_mastery'},NOW).reason,'no_epaulets');assert.equal(s.game.inventory.gold,gold);s.game.inventory.materials.l2_9912=1800;assert.equal(worldShopAction(s,{action:'shop_mastery'},NOW).ok,true);assert.equal(s.game.inventory.materials.l2_9627,1);s.game.stats.lvl=85;changePlayerGameClass(s,'archmage');updatePlayerStats(s);s.game.learnedSkills={1230:true};s.game.skillEnchants={1230:{route:1,level:2}};s.game.inventory.sp=1e9;s.game.inventory.gold=1e9;const offer=enchantOffer(s,1230,{mode:'mastery',route:1});assert.equal(offer.ok,true);const result=enchantL2Skill(s,1230,{mode:'mastery',route:1,random:()=>.999});assert.equal(result.success,false);assert.equal(s.game.skillEnchants[1230].level,2);assert.equal(s.game.inventory.materials.l2_9627,0);});
test('armor accepts three noncompeting defenses, failed insertion consumes a stone, and legacy values persist',()=>{const s=hero(),item={name:'Test',mainType:'armor',category:'body',grade:'S',elementEnabled:true,uid:'a',slots:['up']};for(const e of ['fire','earth','holy','water','wind'])s.game.inventory.materials['attr_stone_'+e]=5;for(const e of ['fire','earth','holy'])assert.equal(addAttribute(s,item,e,'stone',{random:()=>0}).success,true);assert.deepEqual(item.attributes,{water:6,wind:6,dark:6});assert.equal(addAttribute(s,item,'water','stone',{random:()=>0}).reason,'opposite_element');const value=item.attributes.water;assert.equal(addAttribute(s,item,'fire','stone',{random:()=>.99}).success,false);assert.equal(item.attributes.water,value);assert.equal(s.game.inventory.materials.attr_stone_fire,3);s.game.equipmentStats.up={...item,isFilled:true,attributes:null,attribute:{element:'fire',value:25}};assert.equal(attributeProfile(s).resist.fire,25);assert.equal(elementalFactor(150,150),1);});

test('instance rooms persist independently of the originating chat and cannot be loaded by strangers',async()=>{
 const a=hero(1),chat={game:{worldInstances:{one:{id:'one',until:NOW+10000,members:['1','2'],rooms:{'1:r0c0':{mobs:[{instanceId:'m',currentHp:33}],respawns:[]}}}}},members:[a]};a.ownerDocument=()=>chat;
 const documents=new Map(),store={async updateOne(query,patch){documents.set(query._id,{data:patch.$set.data});},async findById(id){return documents.get(id);}};
 await saveWorldInstances(a,{store});chat.game.worldInstances.one.rooms['1:r0c0'].mobs[0].currentHp=0;assert.equal(documents.get('one').data.rooms['1:r0c0'].mobs[0].currentHp,33);
 const b=hero(2),other={game:{},members:[b]};b.ownerDocument=()=>other;b.game.world.instanceId='one';await loadWorldInstances(b,{store,attach:async()=>{}});assert.equal(other.game.worldInstances.one.rooms['1:r0c0'].mobs[0].currentHp,33);
 const stranger=hero(3),third={game:{},members:[stranger]};stranger.ownerDocument=()=>third;stranger.game.world.instanceId='one';await loadWorldInstances(stranger,{store,attach:async()=>{}});assert.equal(third.game.worldInstances,undefined);
});
