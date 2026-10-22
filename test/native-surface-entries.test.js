import test from 'node:test';
import assert from 'node:assert/strict';
import entries from '../template/nativeSurfaceEntries.js';
import routes from '../template/nativeRoutes.js';
import {LOCATIONS,CITY_NPCS} from '../template/worldMap.js';
import {pointInPolygon} from '../functions/game/world/navigation.js';
import {locationTravelQuote} from '../functions/game/world/locationTravel.js';
import {normalTeleportFee} from '../functions/game/world/townTravel.js';
import {nativeTownHub} from '../functions/game/world/nativeTownGraph.js';
import {withTeleportSieges} from '../functions/game/world/teleportSieges.js';
const NOW=1800000000000;
for(const [id,entry] of Object.entries(entries))test(`source surface ${id} keeps its original entrance, keeper tariff and selection around the actual destination`,async()=>{
 const location=LOCATIONS.find(l=>l.id===id),route=routes.routes[id],keeper=CITY_NPCS.find(n=>n.npcId===entry.entrySource.npcId),fee=entry.entryRoutes[0].fee;
 assert.equal(route.city,entry.region);assert.deepEqual(route.sourceEntry,entry.entrySource);
 assert.equal(location.x,entry.x);assert.equal(location.y,entry.y);assert.equal(location.z,entry.z);assert.equal(location.teleportGold,fee);
 assert.equal(location.selectionGeometry,'authored-extent');assert.ok(pointInPolygon(entry,location.polygon));
 if(route.available){const hub=nativeTownHub(route.city);assert.deepEqual(route.from,{x:hub.x,y:hub.y,z:hub.z});assert.ok(route.path.length<=512);}
 else {assert.ok(['antharas-lair','devils-isle'].includes(id));assert.equal(route.reason,'geodata_search_limit');assert.ok(route.attempts.every(a=>a.reason));}
 for(const lvl of [20,85]){const s={game:{stats:{lvl},world:{city:entry.region},inventory:{materials:{}}}};await withTeleportSieges(s,[],()=>assert.equal(locationTravelQuote(s,location,keeper,NOW).gold,normalTeleportFee(s,fee,NOW)));}
 const other=CITY_NPCS.find(n=>n.gateway&&n.city!==entry.region);assert.equal(locationTravelQuote({game:{stats:{lvl:85},inventory:{materials:{}}}},location,other,NOW),null);
 assert.ok(/^[a-f0-9]{64}$/.test(entry.entrySource.sha256));
});
