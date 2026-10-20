import data from '../../../template/ferryData.js';
import shores from '../../../template/nativePortRoutes.js';
import {nativeTownPath} from './nativeTownGraph.js';
import {nativeExit,nativeIsland} from './nativeTravel.js';
import {outdoorPoint} from './holdingEntry.js';
import {getMaterialCount,addMaterial,spendMaterials} from '../player/materials.js';

import {FERRY_PLANS,scheduledFerry,scheduledFerryFrames} from './ferryCalendar.js';
const range=(a,b)=>[a?.x,a?.y,a?.z,b?.x,b?.y,b?.z].every(Number.isFinite)?Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z):Infinity;
export const FERRY_SCHEDULE=Object.freeze({dockMs:data.dockMs,outwardMs:FERRY_PLANS.gludin.duration,inwardMs:FERRY_PLANS.rune.duration,cycleMs:2*data.dockMs+FERRY_PLANS.gludin.duration+FERRY_PLANS.rune.duration});
export function ferryDock(id,now){const visit=scheduledFerry(id,now);if(!visit)return null;const {docked,dockAt,departureAt,until}=visit;return {docked,dockAt,departureAt,until};}
function shorePosition(session){const w=session.game.world;return w.mode==='native'?w.nativePosition:w.mode==='city'?{...outdoorPoint(session),z:w.z}:null;}
export function ferryOptions(session,now){
 const w=session.game.world,at=shorePosition(session),origin=w.mode==='location'?nativeExit(session)?.city:w.city,island=nativeIsland(session);
 return Object.values(data.ports).filter(p=>island?p.island===island:!p.island&&origin&&nativeTownPath(origin,p.city)).map(p=>({id:p.id,name:p.name,city:p.city,vendor:{...p.vendor},dock:{...p.dock},ticket:p.ticket,ticketPrice:p.ticketPrice,tickets:getMaterialCount(session,'l2_'+p.ticket),destination:data.ports[p.destination].island||data.ports[p.destination].city,nearVendor:range(at,p.vendor)<=data.source.vendorInteractionRadius,nearBoarding:range(at,p.dock)<=data.source.boardingRadius,canWalk:['city','native','location'].includes(w.mode)&&(!nativeExit(session)||nativeExit(session).near),...ferryDock(p.id,now)}));
}
export function buyFerryTicket(session,id){
 const port=data.ports[id];if(!port)return {ok:false,reason:'unknown_zone'};
 if(range(shorePosition(session),port.vendor)>data.source.vendorInteractionRadius)return {ok:false,reason:'npc_too_far'};
 if(!(session.game.inventory.gold>=port.ticketPrice))return {ok:false,reason:'not_enough_gold'};
 session.game.inventory.gold-=port.ticketPrice;addMaterial(session,'l2_'+port.ticket);return {ok:true};
}
export function boardFerry(session,id,now){
 const port=data.ports[id],dock=scheduledFerry(id,now);if(!port||!dock)return {ok:false,reason:'unknown_zone'};
 if(range(shorePosition(session),port.dock)>data.source.boardingRadius)return {ok:false,reason:'ferry_boarding_required'};
 if(!dock.docked)return {ok:false,reason:'ferry_away'};
 return {ok:true,trip:{kind:'ferry',port:id,city:data.ports[port.destination].city,arrivalPort:port.destination,departureAt:dock.departureAt,until:dock.until,frames:scheduledFerryFrames(dock),paid:false}};
}
/** Original payForRide charges at departure, not at boarding. */
export function advanceFerry(session,now){
 const w=session.game.world,trip=w.walkHome;if(w.mode!=='road'||trip?.kind!=='ferry')return false;
 if(now>=trip.departureAt&&!trip.paid){
  if(!spendMaterials(session,{['l2_'+data.ports[trip.port].ticket]:1})){
   Object.assign(w,{mode:'native',nativePosition:{...data.ports[trip.port].oust},city:data.ports[trip.port].city,nativeIsland:data.ports[trip.port].island||null,path:[]});delete w.walkHome;return false;
  }
  trip.paid=true;
 }
 if(now<trip.until)return false;
 Object.assign(w,{mode:'native',city:trip.city,nativeIsland:data.ports[trip.arrivalPort||data.ports[trip.port].destination].island||null,nativePosition:{...shores.routes[trip.arrivalPort||data.ports[trip.port].destination].to},path:[],pending:null,channel:null});delete w.walkHome;return true;
}
export function leaveFerry(session,now){
 const w=session.game.world,trip=w.walkHome;
 if(w.mode!=='road'||trip?.kind!=='ferry'||now>=trip.departureAt)return {ok:false,reason:'ferry_moving'};
 Object.assign(w,{mode:'native',city:data.ports[trip.port].city,nativeIsland:data.ports[trip.port].island||null,nativePosition:{...shores.routes[trip.port].to},path:[]});delete w.walkHome;return {ok:true};
}
export function ferryJourneyPosition(trip,now){
 const frames=trip?.kind==='ferry'&&(trip.frames||FERRY_PLANS[trip.port]?.frames);if(!frames)return null;
 const elapsed=now-trip.departureAt;let index=0;while(index+1<frames.length&&frames[index+1].at<=elapsed)index++;
 const from=frames[index],next=frames[index+1],ratio=next?Math.max(0,(elapsed-from.at)/(next.at-from.at)):0;
 const point=Object.fromEntries(['x','y','z'].map(k=>[k,from.point[k]+(next?next.point[k]-from.point[k]:0)*ratio]));
 const berth=next&&['x','y','z'].every(k=>next.point[k]===from.point[k]);
 return {worldPoint:point,worldPath:elapsed>=0&&next&&!berth?[{...next.point}]:[],worldMotion:[{point:{...point},afterMs:0},...(elapsed<0?[{point:{...point},afterMs:-elapsed}]:[]),...frames.slice(index+1,index+17).map(f=>({point:{...f.point},afterMs:f.at-elapsed}))],transportPhase:elapsed<0?'waiting':berth?'berth':'sailing'};
}

export function ferryJourneyDto(trip){if(trip?.kind!=='ferry')return trip;const {frames,...dto}=trip;return dto;}
