import test from 'node:test';
import assert from 'node:assert/strict';
import routes from '../template/nativeRoutes.js';
import {LOCATION_LEVELS} from '../template/locationLevels.js';
import {placeNativeActor,moveNativeActor,advanceNativeActor,nativeActorPoint} from '../functions/game/world/nativeFieldSpace.js';
import {nativeSegment} from '../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
test('the long original coastal approach reaches an Exterminator within the existing search budget',()=>{
 const source=LOCATION_LEVELS['field-of-silence'].floors[0].rooms.flatMap(r=>r.spawns).find(s=>s.x===88549&&s.y===170655);assert.ok(source);
 const from=routes.routes['field-of-silence'].to,actor={x:from.x/2000,y:from.y/2000,native:{z:from.z}},target={};assert.equal(placeNativeActor(target,source),true);
 assert.equal(moveNativeActor(actor,target,1800000000000,150).ok,true);const trip=actor.native.journey;assert.ok(trip.native.path.length>0&&trip.native.path.length<=512);
 let previous=from;for(const point of trip.native.path){assert.ok(nativeSegment(previous,point,{allowed:nativeGroundAllowed,reversible:true}));previous=point;}
 advanceNativeActor(actor,trip.until+1,150);assert.deepEqual(nativeActorPoint(actor),nativeActorPoint(target));assert.equal(actor.native.journey,undefined);
});
