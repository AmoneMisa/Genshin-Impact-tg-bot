import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../template/ferryData.js';
import {ferryPlans,initialFerryClock,advanceFerryClock} from '../functions/game/world/ferryClock.js';
import {scheduledFerry,scheduledFerryFrames} from '../functions/game/world/ferryCalendar.js';
import {ferryJourneyPosition,advanceFerry,FERRY_SCHEDULE} from '../functions/game/world/ferryTravel.js';
import {displayedPosition} from '../webapp/map-rendering.js';
import shores from '../template/nativePortRoutes.js';
const plans=ferryPlans(data),NOW=1800000000000;
test('original vessels share harbor flags, retry busy arrivals on the five-second source grid and retain ten-minute dock stops',()=>{
 const state=initialFerryClock(data),trips=[],visits=[];
 advanceFerryClock(data,plans,state,7*86400000,{onDock:v=>visits.push(v),onVoyage:t=>trips.push(t)});
 assert.ok(trips.some(t=>t.approachAt>t.cruiseEndAt),'shared Gludin harbor actually delays arrivals');
 for(const trip of trips){assert.equal((trip.approachAt-trip.cruiseEndAt)%5000,0);assert.equal(trip.until-trip.approachAt,plans[trip.port].approachMs);}
 for(const visit of visits)assert.equal(visit.departureAt-visit.dockAt,data.vessels.find(v=>v.id===visit.vessel).dockMs);
 const split=initialFerryClock(data);advanceFerryClock(data,plans,split,123456789);const saved=JSON.parse(JSON.stringify(split));advanceFerryClock(data,plans,saved,7*86400000);assert.deepEqual(saved,state);
});
test('checkpoint-derived passenger schedules agree with independent replay and never leak mutable cached state',()=>{
 for(const id of Object.keys(data.ports)){
  const visit=scheduledFerry(id,NOW);assert.ok(visit);assert.equal(visit.destination,data.ports[id].destination);
  const replay=initialFerryClock(data);let found;
  advanceFerryClock(data,plans,replay,visit.until,{onVoyage:t=>{if(t.port===id&&t.departureAt===visit.departureAt)found=t;}});
  assert.equal(found.until,visit.until);assert.equal(found.approachAt,visit.approachAt);
  const frames=scheduledFerryFrames(visit);assert.equal(frames.at(-1).at,visit.until-visit.departureAt);
  assert.deepEqual(frames[0].point,data.ports[id].dock);assert.deepEqual(frames.at(-1).point,data.ports[visit.destination].dock);
  visit.until=0;assert.notEqual(scheduledFerry(id,NOW).until,0);
 }
 assert.equal(scheduledFerry('unknown',NOW),null);assert.equal(scheduledFerry('gludin',NaN),null);
});
test('berth waiting holds the source offshore point, including after serialization and between client updates',()=>{
 const state=initialFerryClock(data);let delayed;
 advanceFerryClock(data,plans,state,7*86400000,{onVoyage:v=>{if(!delayed&&v.approachAt>v.cruiseEndAt)delayed=v;}});
 assert.ok(delayed);
 const trip={kind:'ferry',port:delayed.port,departureAt:delayed.departureAt,until:delayed.until,frames:scheduledFerryFrames(delayed)};
 const at=delayed.cruiseEndAt,waiting=ferryJourneyPosition(trip,at);
 assert.deepEqual(ferryJourneyPosition(trip,delayed.approachAt-1).worldPoint,waiting.worldPoint);
 assert.deepEqual(displayedPosition(waiting,delayed.approachAt-at-1).worldPoint,waiting.worldPoint);
 assert.deepEqual(ferryJourneyPosition(JSON.parse(JSON.stringify(trip)),at).worldPoint,waiting.worldPoint);
});
test('old saved Rune ferry trips keep their recorded arrival despite the newly shared harbor timetable',()=>{
 const trip={kind:'ferry',port:'gludin',city:'rune',departureAt:NOW,until:NOW+FERRY_SCHEDULE.outwardMs,paid:true};
 const s={game:{world:{mode:'road',city:'gludin',walkHome:trip},inventory:{materials:{}}}};
 assert.deepEqual(ferryJourneyPosition(trip,NOW).worldPoint,data.ports.gludin.dock);
 assert.equal(advanceFerry(s,trip.until),true);assert.equal(s.game.world.city,'rune');assert.deepEqual(s.game.world.nativePosition,shores.routes.rune.to);
});
