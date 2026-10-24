import test from 'node:test';
import assert from 'node:assert/strict';
import routes from '../template/nativeRoutes.js';
import pilot from '../template/nativeFieldPilot.js';
import {LOCATION_LEVELS} from '../template/locationLevels.js';
import {nativeFieldZone,nativeFieldEntryVisible,nativeFieldNear,nativeFieldActors,nativeVisibleActors,nativeActorPoint,nativeCombatLine,activateNativeField,nativeFieldBuckets} from '../functions/game/world/nativeFieldSpace.js';
import {nativeSegment} from '../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
import {worldGeodata} from '../functions/game/world/l2jGeodata.js';
import {worldAction,advanceWorld,worldState} from '../functions/game/world/world.js';
import {getHuntState} from '../miniapp/hunt.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
const START=1800000000000,zone='antharas-lair';
function hero(city='hunters'){
 const s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1e6,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city,x:.5,y:.5,path:[],moveAt:START,locks:{}}}};
 const chat={game:{},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);return s;
}
const quiet=s=>{for(const b of nativeFieldBuckets(s.game.hunt?.field))for(const m of b.mobs||[])Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:START+1e12});};
function enter(s,id){assert.equal(worldAction(s,{action:'walk_location',location:id},START).ok,true);const now=s.game.world.walkHome.until+1;advanceWorld(s,now);quiet(s);return now;}

test('Lair uses a reversible source town network approach through Dragon Valley',()=>{
 const route=routes.routes[zone];assert.equal(route.available,true);assert.equal(pilot.fields[zone].fixedCount,713);
 assert.ok(route.attempts.some(a=>a.via==='dragon-valley'&&a.cities.includes('hunters')&&a.cities.includes('giran')&&!a.reason));
 let previous=route.from;for(const p of route.path){assert.ok(nativeSegment(previous,p,{allowed:nativeGroundAllowed,reversible:true}));previous=p;}
 assert.equal(route.to.x,131557);assert.equal(route.to.y,114509);assert.ok(route.returnPath);assert.ok(route.path.length<=512);
});
test('original cave and roof layers cannot attach the same underground bank',()=>{
 const bottom={x:143544,y:110356,z:-3944},roof=worldGeodata.point({...bottom,z:10000});assert.equal(roof.z,160);
 assert.equal(nativeFieldNear(roof,zone),true,'XY residency alone must not authorize entry');
 assert.equal(nativeFieldEntryVisible(roof,zone),false);assert.equal(nativeFieldZone(roof,zone),null);
 assert.equal(nativeFieldEntryVisible(bottom,zone),true);assert.equal(nativeFieldZone(bottom,zone),zone);
});
test('Atlas and combat fallback expose only visible cave actors with a fixed sight budget',async()=>{
 const s=hero(),now=enter(s,zone),all=nativeFieldActors(s.game.hunt),shown=nativeVisibleActors(s.game.hunt);
 assert.ok(all.length>shown.length);assert.ok(shown.length>0&&shown.length<=48);
 assert.ok(shown.every(m=>nativeCombatLine(s.game.hunt.field,m)));
 const expected=shown.map(m=>m.instanceId).sort(),dto=worldState(s,now);assert.deepEqual(dto.nativeField.actors.map(m=>m.instanceId).sort(),expected);
 const hunt=await getHuntState(s,now);assert.deepEqual(hunt.field.mobs.map(m=>m.instanceId).sort(),expected);
 for(const mob of all){assert.equal(nativeActorPoint(mob).x,mob.sourcePosition.x);assert.equal(nativeActorPoint(mob).y,mob.sourcePosition.y);}
});
test('walking from a surface bank into the cave preserves XYZ and both source populations',()=>{
 const s=hero('giran'),now=enter(s,'dragon-valley'),old=s.game.hunt;
 const mob=nativeFieldActors(old)[0];mob.currentHp=Math.floor(mob.hp/2);const saved={id:mob.instanceId,hp:mob.currentHp};
 // The source-checked route ends here. Handoff must not advance or replace it.
 activateNativeField(old,routes.routes[zone].to,now);const point=nativeActorPoint(old.field);
 advanceWorld(s,now);assert.equal(s.game.hunt.zone,zone);assert.deepEqual(nativeActorPoint(s.game.hunt.field),point);
 assert.ok(s.game.world.nativeFields['dragon-valley']);assert.equal(s.game.world.nativeFields[zone],undefined);
 assert.equal(s.game.inventory.gold,1e6);
 assert.equal(worldAction(s,{action:'walk_location',location:'dragon-valley'},now+1).ok,true);
 const end=s.game.world.walkHome.until+1;advanceWorld(s,end);quiet(s);
 const restored=nativeFieldActors(s.game.hunt).find(m=>m.instanceId===saved.id);assert.ok(restored);assert.equal(restored.currentHp,saved.hp);
});
