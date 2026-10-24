import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import policy from '../template/nativeFieldPilot.js';import {LOCATION_LEVELS} from '../template/locationLevels.js';
import {worldGeodata} from '../functions/game/world/l2jGeodata.js';
import {placeNativeActor,nativeActorPoint,activateNativeField,nativeFieldBuckets} from '../functions/game/world/nativeFieldSpace.js';
import {enterHuntField,ensureHunt} from '../functions/game/hunt/huntFight.js';
import change from '../functions/game/player/changePlayerGameClass.js';import update from '../functions/game/player/updatePlayerStats.js';
const points={'sel-mahums':[[78990,62250],[84698,61874],[86075,67510],[82730,69303]],'forsaken-plains':[[166634,34096],[165042,44228],[165713,50008]]};
test('original Spawn.java retains source Z outside the strict correction threshold',()=>{
 const bytes=fs.readFileSync('art-source/geodata/spawns/Spawn.java');assert.equal(createHash('sha256').update(bytes).digest('hex'),policy.groundSpawnHeight.sha256);
 for(const [id,xy]of Object.entries(points))for(const [x,y]of xy){const source=LOCATION_LEVELS[id].floors[0].rooms.flatMap(r=>r.spawns).find(s=>s.x===x&&s.y===y);assert.ok(source);const geo=worldGeodata.point(source);assert.ok(Math.abs(geo.z-source.z)>=300);const actor={};assert.ok(placeNativeActor(actor,source));assert.deepEqual(nativeActorPoint(actor),{x,y,z:source.z});}
 const source={x:84698,y:61874,z:-3148},ground=worldGeodata.point(source).z;
 for(const delta of [299,300,301,-299,-300,-301]){const actor={};assert.ok(placeNativeActor(actor,{...source,z:ground+delta}));assert.equal(nativeActorPoint(actor).z,Math.abs(delta)<300?ground:ground+delta);}
});
test('upgrading old rejected-height slots adds each NPC once and keeps unrelated HP',()=>{
 const now=1800000000000,s={userId:1,game:{stats:{lvl:85},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};change(s,'humanFighter');update(s);assert.ok(enterHuntField(s,'sel-mahums',{now}).ok);
 const source=LOCATION_LEVELS['sel-mahums'].floors[0].rooms.flatMap(r=>r.spawns).find(s=>s.x===84698&&s.y===61874);activateNativeField(s.game.hunt,source,now);ensureHunt(s,now);
 const f=s.game.hunt.field,all=()=>nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs),old=all().find(m=>m.sourcePosition?.x===source.x&&m.sourcePosition?.y===source.y);assert.ok(old);
 const key=old.sourceRoom+':'+old.sourceSlot,other=all().find(m=>m!==old);other.currentHp=7;
 for(const b of nativeFieldBuckets(f))b.mobs=b.mobs.filter(m=>m!==old);delete f.native.loaded[key];f.native.missing[key]='source_ground_unavailable';delete f.native.placementPolicyVersion;
 s.game=JSON.parse(JSON.stringify(s.game));ensureHunt(s,now+1);ensureHunt(s,now+2);
 assert.equal(all().filter(m=>m.sourceRoom+':'+m.sourceSlot===key).length,1);assert.equal(all().find(m=>m.instanceId===other.instanceId).currentHp,7);assert.equal(s.game.hunt.field.native.missing[key],undefined);
});
