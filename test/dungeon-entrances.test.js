import test from 'node:test';
import assert from 'node:assert/strict';
import entries from '../template/dungeonEntranceEntries.js';
import {LOCATIONS} from '../template/worldMap.js';
import {nativeRoute} from '../functions/game/world/nativeTravel.js';
for(const [id,entry] of Object.entries(entries))test(`dungeon ${id} uses the original outside ziggurat instead of an interior destination`,()=>{
 const location=LOCATIONS.find(l=>l.id===id),s=entry.dungeonEntranceSource;
 assert.deepEqual([location.x,location.y,location.z],[entry.x,entry.y,entry.z]);assert.equal(location.region,entry.region);
 assert.equal(s.role,0);assert.notEqual(s.npcId,s.interiorNpcId);assert.equal(s.signNumber,id.startsWith('catacomb-')?2:1);
 assert.ok(Object.keys(s.files).some(f=>f.startsWith('spawns/')));assert.ok(Object.keys(s.files).some(f=>f.startsWith('stats/npcs/')));assert.ok(Object.values(s.files).every(h=>/^[a-f0-9]{64}$/.test(h)));
 for(const point of [entry,s.insideDestination,s.returnDestination])assert.ok(['x','y','z'].every(k=>Number.isFinite(point[k])));
 assert.equal(s.nativeGroundApproach,null);assert.equal(s.teleportTariff,null);assert.equal(nativeRoute(id),null);
});
test('Heretics is placed beside Dion and not at the northern interior coordinates',()=>{
 const entry=entries['catacomb-heretic'];assert.deepEqual([entry.x,entry.y,entry.z],[42608,143952,-5379]);assert.equal(entry.region,'dion');assert.equal(entry.dungeonEntranceSource.npcId,31114);assert.equal(entry.dungeonEntranceSource.interiorNpcId,31120);
 assert.deepEqual(entry.dungeonEntranceSource.insideDestination,{x:-53113,y:-250277,z:-7934});
});
