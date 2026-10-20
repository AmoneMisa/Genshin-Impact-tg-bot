import test from 'node:test';
import assert from 'node:assert/strict';
import {AIRSHIP_PATHS,GRACIA_NPCS} from '../template/graciaTravel.js';
import {airshipJourneyPosition,AIRSHIP_SCHEDULE} from '../functions/game/world/graciaTravel.js';
import {worldAction,worldState,ensureWorld,advanceWorld,cityPoint,CITIES} from '../functions/game/world/world.js';
import {displayedPosition} from '../webapp/map-rendering.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';

const PORT='gludio-airship-field',BASE='keucereus-alliance-base',NOW=1800000000000;
const point=row=>({x:row[0],y:row[1],z:row[2]});
const duration=(start,rows)=>{let total=0,previous=start;for(const row of rows){const speed=row[3]??350;if(speed)total+=Math.hypot(...row.slice(0,3).map((n,i)=>n-previous[i]))/speed*1000;previous=row;}return Math.ceil(total);};
for(const [city,first,second,start] of [
 [BASE,'GLUDIO_TO_WARPGATE','WARPGATE_TO_GRACIA',[-149378,252552,198]],
 [PORT,'GRACIA_TO_WARPGATE','WARPGATE_TO_GLUDIO',AIRSHIP_PATHS.WARPGATE_TO_GRACIA.at(-1)]
])test(`airship to ${city} follows source XYZ, waits and warps without interpolating the teleport`,()=>{
 const trip={kind:'airship',city,departureAt:NOW+10000},a=AIRSHIP_PATHS[first],b=AIRSHIP_PATHS[second],warpAt=duration(start,a);
 const waiting=airshipJourneyPosition(trip,NOW);
 assert.equal(waiting.transportPhase,'waiting');assert.deepEqual(waiting.worldPoint,point(start));
 assert.deepEqual(displayedPosition(waiting,9999).worldPoint,point(start));
 const firstMs=duration(start,a.slice(0,1)),half=firstMs/2;
 const flying=airshipJourneyPosition(trip,trip.departureAt+half);
 for(const k of ['x','y','z'])assert.ok(Math.abs(flying.worldPoint[k]-(point(start)[k]+point(a[0])[k])/2)<1e-8);
 assert.equal(flying.transportPhase,'flying');
 const before=airshipJourneyPosition(trip,trip.departureAt+warpAt-1);
 assert.ok(Math.hypot(before.worldPoint.x-a.at(-2)[0],before.worldPoint.y-a.at(-2)[1])<1);
 const warped=airshipJourneyPosition(trip,trip.departureAt+warpAt);
 assert.deepEqual(warped.worldPoint,point(a.at(-1)));assert.equal(warped.transportPhase,'warpgate');assert.deepEqual(warped.worldPath,[]);
 assert.deepEqual(displayedPosition(before,1).worldPoint,warped.worldPoint);
 assert.deepEqual(displayedPosition(warped,4999).worldPoint,warped.worldPoint);
 assert.deepEqual(airshipJourneyPosition(trip,trip.departureAt+warpAt+4999).worldPoint,warped.worldPoint);
 const total=warpAt+5000+duration(a.at(-1),b);
 assert.equal(total,city===BASE?AIRSHIP_SCHEDULE.outwardMs:AIRSHIP_SCHEDULE.inwardMs);
 assert.deepEqual(airshipJourneyPosition(trip,trip.departureAt+total).worldPoint,point(b.at(-1)));
 for(const offset of [0,9999,10000+half,10000+warpAt-1,10000+warpAt+1,total+20000]){
  const predicted=displayedPosition(waiting,offset,{speed:99999}).worldPoint,authoritative=airshipJourneyPosition(trip,NOW+offset).worldPoint;
  for(const k of ['x','y','z'])assert.ok(Math.abs(predicted[k]-authoritative[k])<1e-7,`${k} at ${offset}`);
 }
});

test('airship movement survives a saved session, rejects ground controls and arrives at the original disembark point',()=>{
 let s={userId:1,game:{stats:{lvl:80,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(s,'humanFighter');updateStats(s);ensureWorld(s,NOW);
 const npc=GRACIA_NPCS.find(n=>n.city===PORT&&n.service==='airship');
 Object.assign(s.game.world,{city:PORT,z:npc.z},cityPoint(CITIES.find(c=>c.id===PORT),npc));
 assert.equal(worldAction(s,{action:'travel_city',city:BASE},NOW).ok,true);advanceWorld(s,NOW+1000);
 const departure=s.game.world.walkHome.departureAt,until=s.game.world.walkHome.until,at=departure+12000;
 const before=worldState(s,at);assert.equal(before.player.mode,'road');assert.ok(before.player.worldMotion.length>1);
 assert.equal(before.player.transportPhase,'flying');assert.equal(before.player.walkHome.native,undefined);
 s=JSON.parse(JSON.stringify(s));assert.deepEqual(worldState(s,at).player.worldPoint,before.player.worldPoint);
 for(const body of [{action:'native_stop'},{action:'native_move',point:{x:0,y:0}},{action:'quick_travel',city:'giran'},{action:'move',point:{x:.5,y:.5}}])assert.equal(worldAction(s,body,at).ok,false);
 assert.deepEqual(worldState(s,at).player.worldPoint,before.player.worldPoint);
 assert.equal(s.game.world.walkHome.until,until);assert.equal(s.game.inventory.gold,1000000);
 const savedPoint=worldState(s,at).player.worldPoint; savedPoint.x=0;
 assert.notEqual(worldState(s,at).player.worldPoint.x,0);
 advanceWorld(s,until-1);assert.equal(s.game.world.city,PORT);
 const landed=worldState(s,until);assert.equal(landed.player.mode,'city');assert.equal(landed.player.city,BASE);assert.equal(landed.player.worldMotion,undefined);assert.equal(landed.player.worldPoint,undefined);
 const expected=cityPoint(CITIES.find(c=>c.id===BASE),{x:-186563,y:243590,z:2608});
 assert.equal(landed.player.x,expected.x);assert.equal(landed.player.y,expected.y);assert.equal(s.game.world.z,2608);
});
