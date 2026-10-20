import test from 'node:test';
import assert from 'node:assert/strict';
import {withTeleportSieges,teleportCastleAllowed} from '../functions/game/world/teleportSieges.js';
import {locationTravelQuote} from '../functions/game/world/locationTravel.js';
import {worldAction,worldState,advanceWorld,quickTravel,CITIES,CITY_NPCS,LOCATIONS,cityPoint} from '../functions/game/world/world.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
import {enterHuntField,changeHuntFloor} from '../functions/game/hunt/huntFight.js';
import {saveNativeField,restoreNativeField} from '../functions/game/world/nativeFieldBanks.js';
const NOW=1800000000000,location=LOCATIONS.find(l=>l.id==='ivory-tower'),keeper=CITY_NPCS.find(n=>n.npcId===30177);
const active={_id:'castle:4',siege:{startsAt:NOW,endsAt:NOW+100000,settled:false}};
function hero(){const s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:'oren',x:.5,y:.5,path:[],moveAt:NOW,locks:{}}}};change(s,'humanFighter');update(s);return s;}
test('destination siege state is server-scoped, checked at time boundaries and cleared after failures',async()=>{
 const s=hero();assert.equal(teleportCastleAllowed(s,[4],NOW),false);
 await withTeleportSieges(s,[active],async()=>{
  assert.equal(teleportCastleAllowed(s,[4],NOW-1),true);assert.equal(teleportCastleAllowed(s,[4],NOW),false);assert.equal(teleportCastleAllowed(s,[4],NOW+100000),true);
  assert.equal(teleportCastleAllowed(s,[3],NOW),true);
  await withTeleportSieges(s,[],()=>assert.equal(teleportCastleAllowed(s,[4],NOW),true));
  assert.equal(teleportCastleAllowed(s,[4],NOW),false);
 });
 await assert.rejects(withTeleportSieges(s,[],()=>{throw Error('request failed');}),/request failed/);
 assert.equal(teleportCastleAllowed(s,[4],NOW),false);assert.equal(JSON.stringify(s).includes('castle:4'),false);
 await withTeleportSieges(s,[{...active,siege:{...active.siege,settled:true}}],()=>assert.equal(teleportCastleAllowed(s,[4],NOW),true));
});
test('Oren siege closes both Ivory teleports without payment while original walking remains available',async()=>{
 const s=hero(),gold=s.game.inventory.gold;assert.deepEqual(location.entryRoutes[0].castleIds,[4]);
 await withTeleportSieges(s,[],()=>assert.ok(locationTravelQuote(s,location,keeper,NOW)));
 await withTeleportSieges(s,[active],()=>{
  assert.equal(locationTravelQuote(s,location,keeper,NOW),null);
  const dto=worldState(s,NOW);assert.equal(dto.locationTravel[location.id],null);assert.equal(dto.quickTravel.locations.some(l=>l.id===location.id),false);assert.equal(dto.nativeWalk[location.id].enabled,true);
  assert.equal(worldAction(s,{action:'travel',location:location.id},NOW).ok,false);
  assert.equal(quickTravel(s,{location:location.id},NOW).reason,'quick_travel_siege');assert.equal(s.game.inventory.gold,gold);
  assert.equal(worldAction(s,{action:'walk_location',location:location.id},NOW).ok,true);
 });
});
test('a siege beginning after a gatekeeper request prevents arrival and payment',async()=>{
 const s=hero(),gold=s.game.inventory.gold;Object.assign(s.game.world,cityPoint(CITIES.find(c=>c.id==='oren'),keeper));
 await withTeleportSieges(s,[],()=>assert.equal(worldAction(s,{action:'travel',location:location.id},NOW-1).ok,true));
 await withTeleportSieges(s,[active],()=>advanceWorld(s,NOW+1000));
 assert.equal(s.game.inventory.gold,gold);assert.equal(s.game.world.mode,'city');assert.equal(s.game.world.pending,null);assert.ok(!s.game.hunt?.field);
});
test('returning from an upper floor restores crater mobs without mixing floor banks',()=>{
 const s=hero();assert.equal(enterHuntField(s,location.id,{now:NOW,floor:1}).ok,true);
 const mob=s.game.hunt.field.mobs[0],id=mob.instanceId;mob.currentHp=Math.floor(mob.currentHp/2);const hp=mob.currentHp;
 assert.equal(changeHuntFloor(s,3,{now:NOW}).ok,true);assert.equal(s.game.hunt.field.mobs.length,0);
 s.game.hunt.field.floorStates[1].mobs[0].aggro=true;saveNativeField(s,NOW);s.game.hunt=null;
 assert.equal(enterHuntField(s,location.id,{now:NOW+1000,floor:1}).ok,true);assert.equal(restoreNativeField(s,location.id,NOW+1000),true);
 const field=s.game.hunt.field;assert.equal(field.floor,1);assert.equal(field.mobs[0].instanceId,id);assert.equal(field.mobs[0].currentHp,hp);assert.equal(field.mobs[0].aggro,false);assert.equal(field.floorStates[1],undefined);assert.equal(field.floorStates[3].mobs.length,0);
 assert.equal(changeHuntFloor(s,3,{now:NOW+2000}).ok,true);assert.equal(field.mobs.length,0);
 assert.equal(changeHuntFloor(s,1,{now:NOW+3000}).ok,true);
 const restored=[field,...Object.values(field.rooms)].flatMap(r=>r.mobs).filter(m=>m.instanceId===id);assert.equal(restored.length,1);assert.equal(restored[0].currentHp,hp);
});
