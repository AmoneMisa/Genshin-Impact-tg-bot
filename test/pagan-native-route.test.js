import test from 'node:test';
import assert from 'node:assert/strict';
import {worldAction,advanceWorld,cityPoint,CITIES,CITY_NPCS} from '../functions/game/world/world.js';
import {nativeExit} from '../functions/game/world/nativeTravel.js';
import {levelTransitions,locationLevel} from '../functions/game/hunt/locationLevels.js';
import {getHuntState} from '../miniapp/hunt.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000;
function hero(){const s={userId:1,game:{stats:{lvl:85},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:'rune',x:.5,y:.5,path:[],moveAt:NOW,locks:{}}}};change(s,'humanFighter');update(s);return s;}
function quiet(s){const f=s.game.hunt.field;for(const m of [f,...Object.values(f.rooms||{})].flatMap(r=>r.mobs||[]))Object.assign(m,{aggressive:false,aggro:false,aggroRange:0,nextAttackAt:NOW+1e12});}
test('native Pagan approach enters the church, retains its authored drop and requires the mirror before walking back',async()=>{
 let s=hero();assert.equal(worldAction(s,{action:'walk_location',location:'pagan-temple'},NOW).ok,true);s=JSON.parse(JSON.stringify(s));advanceWorld(s,NOW+1e7);
 assert.equal(s.game.hunt.field.floor,3);assert.equal(s.game.hunt.field.mobs.length,0);assert.equal(nativeExit(s).floor,3);assert.equal(nativeExit(s).near,true);
 const take=(floor,now)=>{quiet(s);const f=s.game.hunt.field,d=levelTransitions('pagan-temple',f).destinations.find(d=>d.floor===floor);assert.ok(d);Object.assign(f,{room:d.room,...d.point});assert.equal(worldAction(s,{action:'floor',floor},now).ok,true);};
 take(4,NOW+1e7);assert.equal(nativeExit(s).near,false);assert.equal(worldAction(s,{action:'walk_exit'},NOW+1e7).reason,'entrance_required');
 assert.equal(levelTransitions('pagan-temple',s.game.hunt.field).destinations.some(d=>d.floor===3),false);assert.equal(locationLevel('pagan-temple',3).transports[0].sourcePosition,null);
 take(1,NOW+1e7);await getHuntState(s,NOW+1e7);quiet(s);const mob=s.game.hunt.field.mobs[0],id=mob.instanceId;mob.currentHp=2;
 assert.equal(worldAction(s,{action:'walk_exit'},NOW+1e7).reason,'entrance_required');take(3,NOW+1e7);
 Object.assign(s.game.hunt.field,{x:.5,y:.95});assert.equal(worldAction(s,{action:'native_walk_city',city:'rune'},NOW+1e7).ok,true);advanceWorld(s,NOW+2e7);assert.equal(s.game.world.mode,'city');
 const npc=CITY_NPCS.find(n=>n.service==='pagan-church');Object.assign(s.game.world,cityPoint(CITIES.find(c=>c.id==='rune'),npc));
 assert.equal(worldAction(s,{action:'pagan_church'},NOW+2e7).ok,true);assert.equal(s.game.hunt.field.floor,3);take(4,NOW+2e7);take(1,NOW+2e7);
 const f=s.game.hunt.field,restored=[f,...Object.values(f.rooms||{})].flatMap(r=>r.mobs).find(m=>m.instanceId===id);assert.equal(restored?.currentHp,2);assert.equal(s.game.inventory.gold,1000000);
});
