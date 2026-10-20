import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import data from '../template/ferryData.js';
import shores from '../template/nativePortRoutes.js';
import {worldGeodata} from '../functions/game/world/l2jGeodata.js';
import {nativeSegment} from '../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
import {nativeTownHub,nativeTownPath} from '../functions/game/world/nativeTownGraph.js';
import {worldAction,worldState,advanceWorld,ensureWorld,cityPoint,CITIES} from '../functions/game/world/world.js';
import {ferryDock,ferryJourneyPosition,FERRY_SCHEDULE} from '../functions/game/world/ferryTravel.js';
import {displayedPosition} from '../webapp/map-rendering.js';
import {materialInfo} from '../functions/game/player/materials.js';
import {l2IconUrl,L2_MATERIAL_ART} from '../webapp/art/l2-icon-art.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000;
function hero(city='gludin'){
 const s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 change(s,'humanFighter');update(s);ensureWorld(s,NOW);
 const point=nativeTownHub(city);Object.assign(s.game.world,{city,z:point.z},cityPoint(CITIES.find(c=>c.id===city),point));return s;
}
const near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
for(const id of ['gludin','rune'])test(`original ${id} harbor has reversible ground paths and a genuine, correctly priced ticket`,()=>{
 const route=shores.routes[id],port=data.ports[id];assert.deepEqual(route.from,nativeTownHub(id));
 let at=route.from;for(const p of route.path){assert.ok(nativeSegment(at,p,{allowed:nativeGroundAllowed,reversible:true}));at=p;}
 assert.deepEqual(at,route.to);for(const p of route.returnPath){assert.ok(nativeSegment(at,p,{allowed:nativeGroundAllowed,reversible:true}));at=p;}
 assert.deepEqual(at,route.from);assert.deepEqual(route.vendor,route.path[route.vendorIndex-1]);
 assert.equal(route.vendor.x,port.vendor.x);assert.equal(route.vendor.y,port.vendor.y);assert.ok(near(route.to,port.dock)<=1000);assert.ok(nativeGroundAllowed(route.to));
 assert.equal(port.ticketPrice,7500);assert.equal(port.priceConfig.name,'Neutral Territory');
 const item=materialInfo('l2_'+port.ticket);assert.equal(item.metadataMissing,undefined);assert.match(item.name,/^Boat Ticket:/);assert.equal(item.price,5000);assert.equal(item.kind,'consumable');
 const art=L2_MATERIAL_ART[item.key];assert.equal(art,'icon-etc_ticket_red_i00');assert.ok(fs.existsSync('webapp'+l2IconUrl(art)));
});

for(const origin of ['gludin','rune'])test(`complete ${origin} ferry trip preserves source shores, charges at departure and rejoins the destination city`,()=>{
 let s=hero(origin),now=NOW;const target=origin==='gludin'?'rune':'gludin',port=data.ports[origin];
 assert.equal(worldAction(s,{action:'ferry_ticket',port:origin},now).reason,'npc_too_far');
 assert.equal(worldAction(s,{action:'ferry_board',port:origin},now).reason,'ferry_boarding_required');
 assert.equal(worldAction(s,{action:'ferry_walk',port:origin,stop:'vendor'},now).ok,true);
 now=s.game.world.walkHome.until+1;advanceWorld(s,now);assert.equal(s.game.world.mode,'native');assert.deepEqual(s.game.world.nativePosition,shores.routes[origin].vendor);
 assert.equal(worldAction(s,{action:'ferry_ticket',port:origin},now).ok,true);assert.equal(s.game.inventory.gold,992500);
 assert.equal(worldAction(s,{action:'ferry_walk',port:origin,stop:'boarding'},now).ok,true);
 now=s.game.world.walkHome.until+1;advanceWorld(s,now);assert.deepEqual(s.game.world.nativePosition,shores.routes[origin].to);
 now=ferryDock(origin,now).dockAt+1000;
 assert.equal(worldAction(s,{action:'ferry_board',port:origin},now).ok,true);assert.equal(s.game.inventory.materials['l2_'+port.ticket],1);
 assert.equal(worldAction(s,{action:'ferry_leave'},now+1).ok,true);assert.equal(s.game.inventory.materials['l2_'+port.ticket],1);
 assert.equal(worldAction(s,{action:'ferry_board',port:origin},now+2).ok,true);
 const trip={...s.game.world.walkHome};assert.equal(worldState(s,trip.departureAt-1).player.transportPhase,'waiting');
 const departure=worldState(s,trip.departureAt);assert.equal(departure.player.transportPhase,'sailing');assert.equal(s.game.inventory.materials['l2_'+port.ticket],0);
 assert.deepEqual(departure.player.worldPoint,port.dock);
 const mid=trip.departureAt+10000,before=worldState(s,mid).player.worldPoint;s=JSON.parse(JSON.stringify(s));assert.deepEqual(worldState(s,mid).player.worldPoint,before);
 assert.equal(s.game.inventory.materials['l2_'+port.ticket],0);
 for(const body of [{action:'ferry_leave'},{action:'native_stop'},{action:'native_move',point:{x:0,y:0}},{action:'quick_travel',city:'giran'},{action:'ferry_ticket',port:origin}])assert.equal(worldAction(s,body,mid).ok,false);
 assert.equal(s.game.world.walkHome.until,trip.until);assert.equal(s.game.inventory.gold,992500);
 const position=ferryJourneyPosition(trip,mid),predicted=displayedPosition({...position,runSpeed:99999},1000).worldPoint,actual=ferryJourneyPosition(trip,mid+1000).worldPoint;
 assert.ok(near(predicted,actual)<1e-7);assert.ok(position.worldMotion.length<=17);
 advanceWorld(s,trip.until-1);assert.equal(s.game.world.mode,'road');advanceWorld(s,trip.until);
 assert.equal(s.game.world.mode,'native');assert.equal(s.game.world.city,target);assert.deepEqual(s.game.world.nativePosition,shores.routes[target].to);
 assert.equal(worldAction(s,{action:'native_walk_city',city:target},trip.until+1).ok,true);
 now=s.game.world.walkHome.until+1;advanceWorld(s,now);assert.equal(s.game.world.mode,'city');assert.equal(s.game.world.city,target);
 const hub=nativeTownHub(target);assert.deepEqual({x:s.game.world.x,y:s.game.world.y},cityPoint(CITIES.find(c=>c.id===target),hub));
 assert.equal(s.game.inventory.gold,992500);assert.equal(nativeTownPath('gludin','rune'),null);
});

test('vessel absence, wrong tickets, height, missing position and removing the ticket before departure fail closed',()=>{
 const s=hero(),route=shores.routes.gludin,port=data.ports.gludin;Object.assign(s.game.world,{mode:'native',nativePosition:{...route.to}});
 const dock=ferryDock('gludin',NOW),now=dock.dockAt+1;
 assert.equal(worldAction(s,{action:'ferry_board',port:'gludin'},now).ok,true);assert.equal(worldAction(s,{action:'ferry_leave'},now).ok,true);
 s.game.inventory.materials.l2_7904=1;assert.equal(worldAction(s,{action:'ferry_board',port:'gludin'},now).ok,true);assert.equal(worldAction(s,{action:'ferry_leave'},now).ok,true);
 s.game.inventory.materials.l2_7905=1;
 assert.equal(worldAction(s,{action:'ferry_board',port:'gludin'},dock.departureAt+1).reason,'ferry_away');
 s.game.world.nativePosition.z+=2000;assert.equal(worldAction(s,{action:'ferry_board',port:'gludin'},now).reason,'ferry_boarding_required');
 s.game.world.nativePosition={...route.to};assert.equal(worldAction(s,{action:'ferry_board',port:'gludin'},now).ok,true);
 const departure=s.game.world.walkHome.departureAt;delete s.game.inventory.materials.l2_7905;advanceWorld(s,departure);
 assert.equal(s.game.world.mode,'native');assert.deepEqual(s.game.world.nativePosition,port.oust);assert.equal(s.game.inventory.gold,1000000);
 delete s.game.world.nativePosition;assert.equal(worldAction(s,{action:'ferry_ticket',port:'gludin'},now).reason,'npc_too_far');
 assert.equal(ferryDock('missing',now),null);assert.equal(FERRY_SCHEDULE.cycleMs,FERRY_SCHEDULE.outwardMs+FERRY_SCHEDULE.inwardMs+1200000);
 assert.ok(worldGeodata.point(port.oust));
});
