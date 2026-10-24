import test from 'node:test';import assert from 'node:assert/strict';
import {getZones} from '../functions/game/hunt/huntMobs.js';
import {enterHuntField,changeHuntFloor} from '../functions/game/hunt/huntFight.js';
import {saveNativeField,restoreNativeField} from '../functions/game/world/nativeFieldBanks.js';
import {worldAction,advanceWorld,ensureWorld} from '../functions/game/world/world.js';
import {regionLinks} from '../functions/game/world/regionAccess.js';
import change from '../functions/game/player/changePlayerGameClass.js';import update from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000;
function hero(zone){const s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1e8,materials:{scroll_escape:2},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};change(s,'humanFighter');update(s);ensureWorld(s,NOW);if(zone){assert.ok(enterHuntField(s,zone,{now:NOW,random:()=>.5}).ok);Object.assign(s.game.world,{mode:'location',location:zone});}return s;}
const actors=f=>[f,...Object.values(f.rooms||{}),...Object.values(f.floorStates||{}).flatMap(b=>[b,...Object.values(b.rooms||{})])].flatMap(b=>b.mobs||[]);
function quiet(s){for(const m of actors(s.game.hunt.field))Object.assign(m,{aggro:false,aggressive:false,nextAttackAt:NOW+1e9});}

test('all 72 public Atlas spaces preserve population banks through a saved departure',()=>{
 const zones=getZones().filter(z=>!z.instance);assert.equal(zones.length,72);
 for(const zone of zones){
  const s=hero(zone.id),f=s.game.hunt.field,m=f.mobs[0];if(m)m.currentHp=7;
  const ids=actors(f).map(m=>m.instanceId);saveNativeField(s,NOW);assert.ok(s.game.world.nativeFields?.[zone.id],zone.id);
  s.game=JSON.parse(JSON.stringify(s.game));s.game.hunt=null;assert.ok(enterHuntField(s,zone.id,{now:NOW+1000}).ok);
  assert.ok(restoreNativeField(s,zone.id,NOW+1000),zone.id);assert.deepEqual(actors(s.game.hunt.field).map(m=>m.instanceId),ids,zone.id);
  if(m)assert.equal(actors(s.game.hunt.field).find(x=>x.instanceId===m.instanceId).currentHp,7,zone.id);
  assert.equal(s.game.world.nativeFields[zone.id],undefined);
 }
});

test('catacomb escape and paid Atlas return keep wounded actors and consume the snapshot',()=>{
 const s=hero('catacomb-heretic');quiet(s);const victim=s.game.hunt.field.mobs[0];victim.currentHp=7;
 assert.ok(worldAction(s,{action:'escape'},NOW).ok);advanceWorld(s,NOW+15000);assert.equal(s.game.world.mode,'city');
 s.game=JSON.parse(JSON.stringify(s.game));const gold=s.game.inventory.gold;
 assert.ok(worldAction(s,{action:'quick_travel',location:'catacomb-heretic'},NOW+16000).ok);
 assert.ok(s.game.inventory.gold<gold);assert.equal(actors(s.game.hunt.field).find(m=>m.instanceId===victim.instanceId)?.currentHp,7);
 assert.equal(s.game.world.nativeFields['catacomb-heretic'],undefined);
});

test('linked Hellbound spaces bank their departure without bypassing stage or pass checks',()=>{
 const s=hero('steel-citadel');s.game.party={id:'explorers',leaderId:'1'};const chat={game:{hellbound:{level:11}},members:[s]};s.ownerDocument=()=>chat;
 assert.ok(changeHuntFloor(s,2,{now:NOW}).ok);quiet(s);const f=s.game.hunt.field,m=f.mobs[0];if(m)m.currentHp=7;
 const link=regionLinks('steel-citadel',{...f,room:'r2c3',x:.9,y:.1})[0];assert.equal(link.location,'tower-of-infinitum');Object.assign(f,{room:link.room,...link.point});
 assert.equal(worldAction(s,{action:'location_link',location:link.location},NOW).reason,'hellbound_pass_required');assert.equal(s.game.world.nativeFields,undefined);
 s.game.effects.push({l2SkillId:2357,until:NOW+60000});assert.ok(worldAction(s,{action:'location_link',location:link.location},NOW).ok);
 assert.ok(s.game.world.nativeFields['steel-citadel']);assert.equal(s.game.world.location,'tower-of-infinitum');
});

test('public snapshots never capture instanced populations or ship decks',()=>{
 for(const zone of ['cruma-tower','devils-isle']){const s=hero(zone);s.game.world.instanceId='private-voyage';saveNativeField(s,NOW);assert.equal(s.game.world.nativeFields,undefined);}
 const s=hero('devils-isle');assert.ok(changeHuntFloor(s,4,{now:NOW}).ok);saveNativeField(s,NOW);assert.equal(s.game.world.nativeFields,undefined);
});

test('a different arrival floor keeps older floors and pending respawns',()=>{
 const s=hero('tower-of-insolence'),f=s.game.hunt.field,m=f.mobs[0];m.currentHp=7;
 f.respawns.push({room:f.room,sourceSlot:123,mobId:m.mobId,at:NOW+120000});const pending=structuredClone(f.respawns);
 assert.ok(changeHuntFloor(s,2,{now:NOW}).ok);saveNativeField(s,NOW);s.game.hunt=null;
 assert.ok(enterHuntField(s,'tower-of-insolence',{now:NOW+1000,floor:1}).ok);assert.ok(restoreNativeField(s,'tower-of-insolence',NOW+1000));
 assert.equal(s.game.hunt.field.floor,1);assert.equal(actors(s.game.hunt.field).find(x=>x.instanceId===m.instanceId).currentHp,7);assert.deepEqual(s.game.hunt.field.respawns,pending);
});
