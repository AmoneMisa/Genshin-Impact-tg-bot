import test from 'node:test';import assert from 'node:assert/strict';
import {quickTravel,quickTravelPrice,quickTravelBlock,quickCityGold,worldState,CITIES,LOCATIONS,ensureWorld} from '../functions/game/world/world.js';
import holdings from '../template/worldHoldings.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';import updateStats from '../functions/game/player/updatePlayerStats.js';
const NOW=Date.now();
function hero(){const s={userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:80},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};changeClass(s,'warrior');updateStats(s);ensureWorld(s,NOW);return s;}
test('quick city travel is instant, three times the gatekeeper fare, and duplicate destination does not charge',()=>{
 const h=hero(),city=CITIES.find(c=>c.id!==h.game.world.city),gold=h.game.inventory.gold;
 h.game.world.path=[{x:.8,y:.8}];h.game.world.pending={city:'aden'};
 assert.equal(quickTravel(h,{city:city.id},NOW).ok,true);
 assert.equal(h.game.inventory.gold,gold-60000);assert.equal(h.game.world.city,city.id);assert.equal(h.game.world.mode,'city');
 assert.deepEqual(h.game.world.path,[]);assert.equal(h.game.world.pending,null);
 assert.equal(quickTravel(h,{city:city.id},NOW).ok,false);assert.equal(h.game.inventory.gold,gold-60000);
});
test('quick hunting travel resets the previous field and charges only after successful entry',()=>{
 const h=hero(),location=LOCATIONS.find(l=>!l.instance&&l.id==='elven-fields'),gold=h.game.inventory.gold;
 assert.ok(location);assert.equal(quickTravel(h,{location:location.id},NOW).ok,true);
 assert.equal(h.game.world.location,location.id);assert.ok(h.game.hunt.field);assert.equal(h.game.inventory.gold,gold-quickTravelPrice(location));
 for(const m of h.game.hunt.field.mobs){m.aggro=false;}
 const town=CITIES.find(c=>c.id!==h.game.world.city&&quickCityGold(h,c,NOW)!==null);assert.ok(town,'use an original route from the source village');
 const returned=quickTravel(h,{city:town.id},NOW);assert.equal(returned.ok,true,returned.reason);assert.equal(h.game.hunt.field,null);
});
test('dead, combat and siege restrictions cannot be bypassed and never charge',()=>{
 const checks=[h=>h.game.gameClass.stats.hp=0,h=>h.game.stats.inFightTimer=NOW+10000,h=>h.game.world.mode='siege',h=>h.game.world.mode='stronghold',h=>h.game.hunt={field:{mobs:[{aggro:true,currentHp:100}]}}];
 for(const set of checks){const h=hero();set(h);const gold=h.game.inventory.gold;assert.ok(quickTravelBlock(h,NOW));assert.equal(quickTravel(h,{city:'aden'},NOW).ok,false);assert.equal(h.game.inventory.gold,gold);}
 const h=hero();assert.equal(quickTravel(h,{holding:holdings.find(h=>h.kind==='castle').id},NOW).reason,'quick_travel_siege');
 assert.equal(h.game.inventory.gold,1000000);
});
test('insufficient funds, unknown destinations and instance entrances never mutate location or balance',()=>{
 const h=hero();h.game.inventory.gold=1;const old=h.game.world.city;
 assert.equal(quickTravel(h,{city:'aden'},NOW).reason,'not_enough_gold');
 assert.equal(h.game.world.city,old);assert.equal(h.game.inventory.gold,1);
 h.game.inventory.gold=1000000;const instance=LOCATIONS.find(l=>l.instance);
 assert.equal(quickTravel(h,{location:instance.id},NOW).reason,'instance_npc_required');
 assert.equal(quickTravel(h,{city:'fake'},NOW).ok,false);assert.equal(h.game.inventory.gold,1000000);
 assert.equal(worldState(h,NOW).quickTravel.multiplier,3);
});
