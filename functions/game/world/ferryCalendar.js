import {createHash} from 'node:crypto';
import data from '../../../template/ferryData.js';
import calendar from '../../../template/ferryCalendar.js';
import {ferryPlans,advanceFerryClock} from './ferryClock.js';
export const FERRY_PLANS=ferryPlans(data);
const matches=calendar.dataSha256===createHash('sha256').update(JSON.stringify(data)).digest('hex'),cache=new Map();
/** Bounded live windows shared by all passengers; never replay history per player. */
export function scheduledFerry(id,now){
 if(!matches||!data.ports[id]||!Number.isSafeInteger(now)||now<0)return null;
 const hour=Math.floor(now/3600000),start=hour*3600000;
 if(!cache.has(hour)){
  const checkpoint=calendar.checkpoints.findLast(c=>c.at<=start);if(!checkpoint)return null;
  const state=structuredClone(checkpoint);advanceFerryClock(data,FERRY_PLANS,state,start);
  const visits=[],trips=new Map();
  for(const ship of state.ships)if(ship.phase==='dock')visits.push({port:ship.port,vessel:ship.vessel,dockAt:ship.dockAt,departureAt:ship.nextAt});
  advanceFerryClock(data,FERRY_PLANS,state,start+6*3600000,{onDock:v=>visits.push(v),onVoyage:v=>trips.set(v.port+':'+v.departureAt,v)});
  const rows=visits.flatMap(visit=>{const trip=trips.get(visit.port+':'+visit.departureAt);return trip?[{...visit,...trip}]:[];});
  if(cache.size>=4)cache.delete(cache.keys().next().value);cache.set(hour,rows);
 }
 const visit=cache.get(hour).find(v=>v.port===id&&v.departureAt>now);
 return visit?{...visit,docked:now>=visit.dockAt}:null;
}
export function scheduledFerryFrames(visit){
 const plan=FERRY_PLANS[visit.port],delay=visit.approachAt-visit.cruiseEndAt;
 const frames=plan.frames.map(f=>({point:{...f.point},at:f.at+(f.at>plan.cruiseMs?delay:0)}));
 if(delay>0){const index=frames.findLastIndex(f=>f.at<=plan.cruiseMs);frames.splice(index+1,0,{point:{...frames[index].point},at:plan.cruiseMs+delay});}
 return frames;
}
