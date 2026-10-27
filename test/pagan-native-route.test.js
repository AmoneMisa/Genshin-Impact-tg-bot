import test from 'node:test';
import assert from 'node:assert/strict';
import {worldAction,advanceWorld,cityPoint,CITIES,CITY_NPCS} from '../functions/game/world/world.js';
import {nativeExit} from '../functions/game/world/nativeTravel.js';
import {levelTransitions,locationLevel} from '../functions/game/hunt/locationLevels.js';
import {getHuntState} from '../miniapp/hunt.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
import access from '../template/paganAccess.js';
const NOW=1800000000000;
test('Pagan source keeps both mirror NPCs, exact door passes and a source-null jump with a separately verified native descent',()=>{
 assert.deepEqual(access.mirrors[32039].from,{x:34842,y:-49756,z:-763});
 assert.deepEqual(access.mirrors[32039].to,{x:-12766,y:-35840,z:-10856});
 assert.deepEqual(access.mirrors[32040].from,{x:-11986,y:-35903,z:-10857});
 assert.deepEqual(access.mirrors[32040].to,{x:36640,y:-51218,z:718});
 assert.deepEqual(access.doors.map(d=>[d.npcId,d.doorIds,d.anyCarriedItem]),[
  [32034,[19160001],[8064,8065,8067]],[32035,[19160001],[]],
  [32036,[19160010,19160011],[8067]],[32037,[19160010,19160011],[]]
 ]);
 assert.ok(access.doors.every(d=>d.openMs===10000&&!d.consumeItem&&d.worldScenarioImplemented));
 assert.equal(access.churchDrop.sourcePosition,null);assert.equal(access.churchDrop.implementedInNativeWorld,true);
 for(const npc of Object.values(access.npcs))assert.equal(npc.source.sha256,access.source.files[npc.source.file]);
});
function hero(){const s={userId:1,game:{stats:{lvl:85},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:'rune',x:.5,y:.5,path:[],moveAt:NOW,locks:{}}}};change(s,'humanFighter');update(s);return s;}
function quiet(s){const f=s.game.hunt.field;for(const m of [f,...Object.values(f.rooms||{})].flatMap(r=>r.mobs||[]))Object.assign(m,{aggressive:false,aggro:false,aggroRange:0,nextAttackAt:NOW+1e12});}
test('legacy authored drop metadata stays explicit while native travel owns church movement',()=>{
 assert.equal(locationLevel('pagan-temple',3).transports[0].sourcePosition,null);
 assert.equal(access.churchDrop.geometry,'derived-stored-layer-descent');
 assert.equal(access.churchDrop.route,'template/paganChurchRoute.js');
 const s=hero();assert.ok(worldAction(s,{action:'walk_location',location:'pagan-temple'},NOW).ok);
 advanceWorld(s,NOW+1e7);assert.equal(s.game.hunt.field.native.sourceFloor,3);
 assert.equal(worldAction(s,{action:'floor',floor:4},NOW+1e7).ok,false,'legacy room movement cannot bypass the source route');
});
