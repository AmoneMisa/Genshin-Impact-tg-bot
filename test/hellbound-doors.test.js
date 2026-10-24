import test from 'node:test';import assert from 'node:assert/strict';
import source from '../template/hellboundAccess.js';import nativeWorld from '../template/nativeWorld.js';
import {worldGeodata} from '../functions/game/world/l2jGeodata.js';
import {nativeGroundAllowed,nativeGroundAtStage,nativeGroundFor,nativeGroundBlock} from '../functions/game/world/nativeGround.js';
import {nativeSegment,findNativePath} from '../functions/game/world/nativeNavigation.js';
import {createNativeJourney,advanceNativeJourney} from '../functions/game/world/nativeJourney.js';
import {moveNativeActor,advanceNativeActor,nativeActorPoint,nativeCombatLine} from '../functions/game/world/nativeFieldSpace.js';
import {ROOM_SIZE} from '../functions/game/world/navigation.js';

function crossing(id){
 const d=nativeWorld.doors.find(d=>d.id===String(id));assert.ok(d);const xs=d.polygon.map(p=>p[0]),ys=d.polygon.map(p=>p[1]),x=(Math.min(...xs)+Math.max(...xs))/2,y=(Math.min(...ys)+Math.max(...ys))/2,z=(d.minZ+d.maxZ)/2;
 const horizontal=Math.max(...xs)-Math.min(...xs)<Math.max(...ys)-Math.min(...ys);
 const a=worldGeodata.point({x:horizontal?Math.min(...xs)-48:x,y:horizontal?y:Math.min(...ys)-48,z}),b=worldGeodata.point({x:horizontal?Math.max(...xs)+48:x,y:horizontal?y:Math.max(...ys)+48,z});
 assert.ok(a&&b);return {a,b,center:worldGeodata.point({x,y,z})};
}
test('only the four pinned HellboundEngine thresholds open their exact source door volumes',()=>{
 assert.deepEqual(source.doors,[{id:19250001,minimumStage:5},{id:19250002,minimumStage:5},{id:20250001,minimumStage:9},{id:20250002,minimumStage:7}]);
 for(const d of source.doors){const {a,b,center}=crossing(d.id);assert.equal(nativeGroundBlock(center),'door_state_required');
  for(let stage=0;stage<=11;stage++){assert.equal(nativeGroundAtStage(stage)(center),stage>=d.minimumStage,d.id+':'+stage);assert.equal(Boolean(nativeSegment(a,b,{allowed:nativeGroundAtStage(stage)})),stage>=d.minimumStage);}
  assert.equal(nativeGroundAllowed(center),false,'offline/static checks cannot assume an open gate');
 }
 const other=nativeWorld.doors.find(d=>!source.doors.some(s=>String(s.id)===d.id));const point={x:other.polygon.reduce((n,p)=>n+p[0],0)/4,y:other.polygon.reduce((n,p)=>n+p[1],0)/4,z:(other.minZ+other.maxZ)/2};assert.equal(nativeGroundAtStage(11)(point),false,'other doors stay closed');
});
test('saved journeys and actor motion recheck the current gate state and do not cross a gate that closes',()=>{
 for(const d of source.doors){const {a,b}=crossing(d.id),allowed=nativeGroundAtStage(d.minimumStage),plan=findNativePath(a,b,{allowed,maxNodes:1000,reversible:true});assert.ok(plan.ok);
  const trip=createNativeJourney(plan.start,plan.path,{now:0,speed:100,allowed});assert.ok(trip);advanceNativeJourney(trip,1,100,{allowed});const saved=JSON.parse(JSON.stringify(trip)),before={...saved.native.point};
  assert.equal(advanceNativeJourney(saved,10000,100,{allowed:nativeGroundAtStage(d.minimumStage-1)}),false);assert.equal(saved.native.blocked,'path_blocked');assert.deepEqual(saved.native.point,before);
  const open=JSON.parse(JSON.stringify(trip));assert.equal(advanceNativeJourney(open,10000,100,{allowed}),true);assert.deepEqual(open.native.point,{x:b.x,y:b.y,z:b.z});
  const actor={x:a.x/ROOM_SIZE,y:a.y/ROOM_SIZE,native:{z:a.z,hellboundStage:d.minimumStage}},target={x:b.x/ROOM_SIZE,y:b.y/ROOM_SIZE,native:{z:b.z}};
  assert.ok(moveNativeActor(actor,target,0,100).ok);const start=nativeActorPoint(actor);actor.native.hellboundStage=d.minimumStage-1;advanceNativeActor(actor,10000,100);assert.deepEqual(nativeActorPoint(actor),start);assert.equal(actor.native.journey,undefined);
 }
});
test('native visibility uses the same trusted gate phase as walking',()=>{
 for(const d of source.doors){const {a,b}=crossing(d.id),actor=p=>({x:p.x/ROOM_SIZE,y:p.y/ROOM_SIZE,native:{z:p.z,hellboundStage:d.minimumStage-1}}),one=actor(a),two=actor(b);
  assert.equal(nativeCombatLine(one,two),false);one.native.hellboundStage=d.minimumStage;two.native.hellboundStage=d.minimumStage;assert.equal(nativeCombatLine(one,two),true);
 }
 const point=crossing(20250001).center,session={game:{hellbound:{level:11},world:{hellboundLevel:11}},ownerDocument:()=>({game:{hellbound:{level:8}}})};assert.equal(nativeGroundFor(session)(point),false);session.ownerDocument=()=>({game:{hellbound:{level:9}}});assert.equal(nativeGroundFor(session)(point),true);
});
