import test from 'node:test';
import assert from 'node:assert/strict';
import entries from '../template/nativeSpawnEntries.js';
import territoryEntries from '../template/nativeTerritoryEntries.js';
import tariffs from '../template/nativeSurfaceEntries.js';
import routes from '../template/nativeRoutes.js';
import {LOCATIONS,CITY_NPCS,worldState,worldAction,quickTravel} from '../functions/game/world/world.js';
import {locationTravelQuote} from '../functions/game/world/locationTravel.js';
import {quickTravelDestinations} from '../webapp/quick-travel-menu.js';
import {movementHtml} from '../webapp/atlas-ui.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
import {worldGeodata} from '../functions/game/world/l2jGeodata.js';
const NOW=1800000000000;
function hero(city){const s={userId:1,game:{stats:{lvl:85},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city,x:.5,y:.5,path:[],moveAt:NOW,locks:{}}}};change(s,'humanFighter');update(s);return s;}
for(const [id,entry] of Object.entries({...entries,...territoryEntries})){
 test(`spawn point ${id} keeps its original NPC provenance and does not claim a tariff`,()=>{
  const place=LOCATIONS.find(l=>l.id===id),route=routes.routes[id];assert.equal(tariffs[id],undefined);
  assert.deepEqual([place.x,place.y,place.z],[entry.x,entry.y,entry.z]);assert.equal(place.teleportGold,null);assert.deepEqual(place.entryRoutes,[]);assert.equal(place.access.kind,'walk-only');
  const source=entry.entrySource;assert.match(source.sha256,/^[a-f0-9]{64}$/);assert.ok(!entries[id]||!territoryEntries[id]);
  if(source.type==='NPC_SPAWN'){assert.equal(source.coordinateSource,'point');assert.ok(Number.isInteger(source.npcId));}
  else{
   assert.equal(source.type,'TERRITORY_BOUNDARY');assert.equal(source.coordinateSource,'territory-node');assert.equal(source.originalEntrance,null);assert.equal(source.heightSource,'l2j-geodata');assert.equal(source.geodataCommit,worldGeodata.manifest.commit);
   assert.deepEqual([entry.x,entry.y],source.polygon[source.vertex]);assert.ok(entry.z>=source.minZ&&entry.z<=source.maxZ);
   assert.equal(worldGeodata.point({x:entry.x,y:entry.y,z:source.minZ}).z,entry.z);assert.equal(worldGeodata.point({x:entry.x,y:entry.y,z:source.maxZ}).z,entry.z);
   assert.ok(source.npcIds.length&&source.npcIds.every(Number.isInteger));
  }
  assert.equal(route.available,true);assert.deepEqual(route.sourceEntry,entry.entrySource);assert.ok(route.returnPath&&route.path.length<=512);
 });
 test(`spawn point ${id} is visible in the shared Atlas with teleport disabled and walking available`,()=>{
  const s=hero(entry.region),dto=worldState(s,NOW),row=quickTravelDestinations(dto,'hunting').find(l=>l.id===id);
  assert.ok(row?.walkingOnly&&row.unavailable);assert.equal(row.gold,null);assert.equal(dto.locationTravel[id],null);assert.equal(dto.nativeWalk[id].enabled,true);
  assert.match(movementHtml(dto,{section:'hunting',selected:{kind:'location',id}}),/data-quick-confirm disabled/);
  for(const npc of CITY_NPCS.filter(n=>n.gateway))assert.equal(locationTravelQuote(s,LOCATIONS.find(l=>l.id===id),npc,NOW),null);
 });
 test(`spawn point ${id} rejects forged free teleports without payment and accepts its physical walk`,()=>{
  const s=hero(entry.region),gold=s.game.inventory.gold;
  assert.equal(quickTravel(s,{location:id,gold:0},NOW).reason,'city_route_unavailable');assert.equal(worldAction(s,{action:'travel',location:id,gold:0},NOW).reason,'city_route_unavailable');
  assert.equal(s.game.inventory.gold,gold);assert.equal(s.game.world.mode,'city');assert.ok(!s.game.hunt?.field);
  assert.equal(worldAction(s,{action:'walk_location',location:id},NOW).ok,true);assert.equal(s.game.world.walkHome.location,id);assert.equal(s.game.inventory.gold,gold);
 });
}
