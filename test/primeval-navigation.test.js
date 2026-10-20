import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../template/ferryData.js';
import shores from '../template/nativePortRoutes.js';
import islands from '../template/nativeIslandRoutes.js';
import entries from '../template/nativeIslandEntries.js';
import {worldAction,worldState,advanceWorld,ensureWorld,cityPoint,CITIES,LOCATIONS,CITY_NPCS} from '../functions/game/world/world.js';
import {nativeSegment} from '../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
import {nativeTownHub} from '../functions/game/world/nativeTownGraph.js';
import {ferryDock} from '../functions/game/world/ferryTravel.js';
import {getHuntState} from '../miniapp/hunt.js';
import {locationTravelQuote} from '../functions/game/world/locationTravel.js';
import {l2IconUrl,L2_MATERIAL_ART} from '../webapp/art/l2-icon-art.js';
import {materialInfo} from '../functions/game/player/materials.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000;
function hero(){const s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};change(s,'humanFighter');update(s);ensureWorld(s,NOW);const hub=nativeTownHub('rune');Object.assign(s.game.world,{city:'rune',z:hub.z},cityPoint(CITIES.find(c=>c.id==='rune'),hub));return s;}
const quiet=field=>{for(const mob of [field,...Object.values(field.rooms||{})].flatMap(r=>r.mobs||[]))Object.assign(mob,{aggressive:false,aggro:false,nextAttackAt:NOW+1e12});};
function walk(s,body,now){const result=worldAction(s,body,now);assert.equal(result.ok,true,result.reason);now=s.game.world.walkHome.until+1;advanceWorld(s,now);return now;}
function sail(s,id,now){if(!worldState(s,now).ferries.find(p=>p.id===id)?.nearVendor)now=walk(s,{action:'ferry_walk',port:id,stop:'vendor'},now);assert.equal(worldAction(s,{action:'ferry_ticket',port:id},now).ok,true);now=walk(s,{action:'ferry_walk',port:id,stop:'boarding'},now);now=ferryDock(id,now).dockAt+1000;assert.equal(worldAction(s,{action:'ferry_board',port:id},now).ok,true);now=s.game.world.walkHome.until;advanceWorld(s,now);return now;}
test('Primeval uses the original wharf entrance, ticket names/icons/fees and reversible shore paths',()=>{
 const entry=entries['primeval-isle'],location=LOCATIONS.find(l=>l.id==='primeval-isle'),route=islands.routes['primeval-isle'];
 assert.deepEqual({x:entry.x,y:entry.y,z:entry.z},{x:11235,y:-24026,z:-3640});assert.equal(location.entrySource.file,'teleporters/town/31320.xml');
 assert.equal(location.teleportGold,6400);const s=hero(),keeper=CITY_NPCS.find(n=>n.npcId===31320);
 assert.equal(locationTravelQuote(s,location,keeper,NOW).gold,6400);assert.equal(locationTravelQuote(s,location,CITY_NPCS.find(n=>n.city==='giran'&&n.gateway),NOW),null);
 for(const [id,icon] of [[8924,'red'],[8925,'blue']]){const ticket=materialInfo('l2_'+id);assert.equal(ticket.price,25000);assert.ok(ticket.name.startsWith('Boat Ticket:'));assert.equal(L2_MATERIAL_ART[ticket.key],`icon-etc_ticket_${icon}_i00`);assert.ok(l2IconUrl(L2_MATERIAL_ART[ticket.key]));}
 for(const id of ['rune-primeval','primeval-rune']){const r=shores.routes[id];let at=r.from;for(const p of r.path){assert.ok(nativeSegment(at,p,{allowed:nativeGroundAllowed,reversible:true}));at=p;}assert.deepEqual(at,r.to);assert.equal(data.ports[id].ticketPrice,37500);assert.ok(Math.hypot(at.x-data.ports[id].dock.x,at.y-data.ports[id].dock.y,at.z-data.ports[id].dock.z)<=1000);}
 assert.ok(nativeSegment(route.from,route.to,{allowed:nativeGroundAllowed,reversible:true}));
});
test('the island requires a real landing; shore/field/save/shore round trips preserve one canonical hunting bank and never walk to Rune',async()=>{
 let s=hero(),now=NOW;
 assert.equal(worldState(s,now).nativeWalk['primeval-isle'].enabled,false);
 assert.equal(worldAction(s,{action:'walk_location',location:'primeval-isle'},now).reason,'location_path_required');
 assert.equal(worldAction(s,{action:'ferry_walk',port:'primeval-rune'},now).reason,'location_path_required');
 now=sail(s,'rune-primeval',now);s=JSON.parse(JSON.stringify(s));
 assert.equal(s.game.world.mode,'native');assert.equal(s.game.world.nativeIsland,'primeval-isle');assert.deepEqual(s.game.world.nativePosition,shores.routes['primeval-rune'].to);
 let dto=worldState(s,now);assert.deepEqual(dto.nativeWalkCities,[]);assert.deepEqual(dto.ferries.map(p=>p.id),['primeval-rune']);assert.equal(dto.nativeWalk['primeval-isle'].enabled,true);assert.equal(dto.nativeWalk['angel-waterfall'].enabled,false);
 assert.equal(worldAction(s,{action:'native_walk_city',city:'rune'},now).reason,'location_path_required');
 assert.equal(worldAction(s,{action:'walk_location',location:'beast-farm'},now).reason,'location_path_required');
 assert.equal(worldAction(s,{action:'ferry_walk',port:'rune'},now).reason,'location_path_required');
 assert.equal(worldAction(s,{action:'native_move',point:{x:43824,y:-47664}},now).ok,false);
 now=walk(s,{action:'walk_location',location:'primeval-isle'},now);assert.equal(s.game.world.mode,'location');assert.equal(s.game.hunt.zone,'primeval-isle');
 await getHuntState(s,now);quiet(s.game.hunt.field);let field=s.game.hunt.field;const mob=field.mobs[0];assert.ok(mob);mob.currentHp--;const id=mob.instanceId,hp=mob.currentHp;
 Object.assign(field,{room:'r0c0',floor:1,x:.1,y:.1});assert.equal(worldAction(s,{action:'walk_exit'},now).reason,'entrance_required');
 Object.assign(field,{x:.5,y:.95});now=walk(s,{action:'walk_exit'},now);assert.equal(s.game.world.mode,'native');assert.deepEqual(s.game.world.nativePosition,shores.routes['primeval-rune'].vendor);assert.equal(s.game.world.nativeIsland,'primeval-isle');
 assert.ok(s.game.world.nativeFields['primeval-isle']);s=JSON.parse(JSON.stringify(s));
 now=walk(s,{action:'walk_location',location:'primeval-isle'},now);await getHuntState(s,now);quiet(s.game.hunt.field);field=s.game.hunt.field;
 assert.equal(field.mobs.find(m=>m.instanceId===id)?.currentHp,hp);Object.assign(field,{room:'r0c0',floor:1,x:.5,y:.95});
 now=walk(s,{action:'walk_exit'},now);now=sail(s,'primeval-rune',now);
 assert.equal(s.game.world.nativeIsland,null);assert.equal(s.game.world.mode,'native');assert.deepEqual(s.game.world.nativePosition,shores.routes['rune-primeval'].to);
 now=walk(s,{action:'native_walk_city',city:'rune'},now);assert.equal(s.game.world.mode,'city');assert.equal(s.game.world.city,'rune');assert.equal(s.game.inventory.gold,925000);
 assert.equal(s.game.inventory.materials.l2_8924,0);assert.equal(s.game.inventory.materials.l2_8925,0);
});
