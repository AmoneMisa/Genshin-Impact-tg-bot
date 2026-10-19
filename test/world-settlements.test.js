import test from 'node:test';
import assert from 'node:assert/strict';
import {CITIES,CITY_NPCS,LOCATIONS,worldAction,advanceWorld,worldState,cityPoint} from '../functions/game/world/world.js';
import {SETTLEMENTS,CREATION_POINTS} from '../template/worldSettlements.js';
import {START_CLASSES,L2_CLASS_META,raceOf} from '../template/l2ClassMeta.js';
import holdings from '../template/worldHoldings.js';
import {MAP_TILE_IDS} from '../webapp/art/world/l2/tiles.js';
import {placeNewCharacter} from '../functions/game/world/creation.js';
import {arriveHoldingEntrance,enterHolding,leaveHolding,outdoorPoint} from '../functions/game/world/holdingEntry.js';
import {hallAction} from '../functions/game/world/hall.js';
import {townTravelQuote,normalTeleportFee} from '../functions/game/world/townTravel.js';
import {getZone} from '../functions/game/hunt/huntMobs.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
const NOW=new Date(2026,9,16,12).getTime();
function hero(){const s={userId:1,game:{stats:{lvl:80,currentExp:0},inventory:{gold:1e7,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{}}};changeClass(s,'humanFighter');updateStats(s);s.game.world={mode:'city',city:'giran',x:.5,y:.5,path:[],moveAt:NOW,locks:{}};return s;}
const tile=p=>`${Math.floor(p.x/32768)+20}_${Math.floor(p.y/32768)+18}`;
test('all eleven starting classes use their race settlement and original creation points with map coverage',()=>{
 assert.equal(CITIES.length,20);assert.equal(SETTLEMENTS.length,8);
 for(const id of START_CLASSES){
  const s=hero(),name=L2_CLASS_META[id].key;s.game.gameClass.stats.name='noClass';
  changeClass(s,name,{now:NOW,random:()=>0});
  const w=s.game.world,c=CITIES.find(c=>c.id===w.city),original=CREATION_POINTS[id][0];
  assert.equal(c.starterRace,raceOf(id));assert.deepEqual(outdoorPoint(s),{x:original.x,y:original.y});
  assert.equal(w.z,original.z);assert.equal(w.creation.classId,id);assert.ok(w.x>=0&&w.x<=1&&w.y>=0&&w.y<=1);
  assert.ok(MAP_TILE_IDS.includes(tile(original)),name+' creation tile');
  const saved=structuredClone(w);changeClass(s,name,{now:NOW+1});assert.deepEqual(s.game.world,saved,'existing character is not relocated');
 }
 for(const c of SETTLEMENTS){assert.ok(MAP_TILE_IDS.includes(tile(c)),c.id);if(c.id!=='floran')assert.ok(CITY_NPCS.some(n=>n.city===c.id&&n.gateway&&!n.adapted));}
 assert.equal(placeNewCharacter(hero(),'unknown'),false);
});
test('source town routes charge once, respect main-class free travel and do not invent a Floran gatekeeper',()=>{
 const s=hero();s.game.world.city='talking-island-village';s.game.stats.lvl=20;
 assert.equal(normalTeleportFee(s,9400,NOW),0);s.game.stats.lvl=80;
 const quote=townTravelQuote(s,'gludin',NOW);assert.equal(quote.mode,'teleport');assert.equal(quote.gold,quote.fee);
 assert.equal(normalTeleportFee(s,9400,new Date(2026,9,19,21).getTime()),4700);
 const gold=s.game.inventory.gold;assert.equal(worldAction(s,{action:'travel_city',city:'gludin'},NOW).ok,true);
 advanceWorld(s,NOW+1e6);assert.equal(s.game.world.city,'gludin');assert.equal(s.game.inventory.gold,gold-quote.gold);
 advanceWorld(s,NOW+2e6);assert.equal(s.game.inventory.gold,gold-quote.gold);
 s.game.world.city='floran';assert.equal(townTravelQuote(s,'giran',NOW),null);assert.equal(townTravelQuote(s,'dion',NOW).mode,'walk');
 assert.equal(worldState(s,NOW).quickTravel.cities.length,0);assert.equal(worldAction(s,{action:'quick_travel',city:'giran'},NOW).reason,'city_route_unavailable');
 assert.equal(worldAction(s,{action:'travel_city',city:'dion'},NOW).ok,true);advanceWorld(s,s.game.world.walkHome.until);assert.equal(s.game.world.city,'dion');
});
test('all 74 holdings require actual door proximity and preserve the exterior position on exit',()=>{
 assert.equal(holdings.length,74);
 for(const h of holdings){
  const s=hero();assert.ok(h.entry?.source&&Number.isFinite(h.entry.z),h.id);s.game.world.readyHolding=h.id;
  assert.equal(enterHolding(s,h,h.kind==='hall'?'hall':'stronghold',NOW).ok,false,'stale flag rejected');
  arriveHoldingEntrance(s,h,NOW);const before=outdoorPoint(s);assert.equal(enterHolding(s,h,h.kind==='hall'?'hall':'stronghold',NOW).ok,true);
  s.game.world.x=.1;assert.equal(leaveHolding(s,h,{now:NOW}).reason,'entrance_required');s.game.world.x=.5;
  assert.equal(leaveHolding(s,h,{now:NOW}).ok,true);assert.deepEqual(outdoorPoint(s),before);assert.equal(s.game.world.holdingReturn,undefined);
 }
});
test('hall entry enforces ownership and a city approach reaches the original door',()=>{
 const h=holdings.find(h=>h.kind==='hall'&&!h.conquerable&&h.region==='giran'),s=hero(),clan={_id:'c'};
 const record={owner:{clanId:'c'}};
 assert.equal(hallAction(s,clan,h,record,{action:'hall_enter'},NOW).reason,'holding_region_required');
 assert.equal(worldAction(s,{action:'holding_travel',holding:h.id},NOW).ok,true);
 advanceWorld(s,s.game.world.walkHome?.until||NOW+1e6);
 assert.ok(Math.hypot(outdoorPoint(s).x-h.entry.x,outdoorPoint(s).y-h.entry.y)<=180);
 assert.equal(hallAction(s,{_id:'other'},h,record,{action:'hall_enter'},NOW).reason,'hall_access_denied');
 assert.equal(hallAction(s,clan,h,record,{action:'hall_enter'},NOW).ok,true);
 assert.equal(hallAction(s,clan,h,record,{action:'hall_leave'},NOW).ok,true);
});
test('Ketra, Varka and Monastery share original NPCs and atlas destinations',()=>{
 for(const [id,count] of [['ketra-outpost',22],['varka-outpost',22],['monastery-of-silence',9]]){
  const zone=getZone(id);assert.ok(zone);assert.equal(zone.mobs.length,count);assert.equal(LOCATIONS.filter(l=>l.id===id).length,1);
 }
 const c=CITIES.find(c=>c.id==='orc-village'),npc=CITY_NPCS.find(n=>n.city===c.id&&n.gateway),point=cityPoint(c,npc);
 assert.deepEqual(point,{x:.5,y:.5});
});
