import data from '../../../template/ferryData.js';
import shores from '../../../template/nativePortRoutes.js';
import {nativeTownPath} from './nativeTownGraph.js';
import {nativeExit} from './nativeTravel.js';
import {outdoorPoint} from './holdingEntry.js';
import {getMaterialCount,addMaterial,spendMaterials} from '../player/materials.js';

const xyz=row=>({x:row[0],y:row[1],z:row[2]});
const other=id=>id==='gludin'?'rune':'gludin';
const range=(a,b)=>[a?.x,a?.y,a?.z,b?.x,b?.y,b?.z].every(Number.isFinite)?Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z):Infinity;
function sailing(from,names){let at=0,previous=data.ports[from].dock;const frames=[{point:{...previous},at:0}];for(const name of names)for(const row of data.paths[name]){const point=xyz(row);at+=Math.ceil(range(previous,point)/row[3]*1000);frames.push({point,at});previous=point;}return frames;}
const voyages={gludin:sailing('gludin',['GLUDIN_TO_RUNE','RUNE_DOCK']),rune:sailing('rune',['RUNE_TO_GLUDIN','GLUDIN_DOCK'])};
export const FERRY_SCHEDULE=Object.freeze({dockMs:data.dockMs,outwardMs:voyages.gludin.at(-1).at,inwardMs:voyages.rune.at(-1).at,cycleMs:2*data.dockMs+voyages.gludin.at(-1).at+voyages.rune.at(-1).at});
/** Same public vessel clock for every passenger; no client time, speed or destination. */
export function ferryDock(id,now){
 if(!data.ports[id]||!Number.isFinite(now))return null;
 const offset=id==='gludin'?0:data.dockMs+FERRY_SCHEDULE.outwardMs,cycle=FERRY_SCHEDULE.cycleMs;
 const since=((now-offset)%cycle+cycle)%cycle,docked=since<data.dockMs;
 const dockAt=docked?now-since:now+cycle-since;
 return {docked,dockAt,departureAt:dockAt+data.dockMs,until:dockAt+data.dockMs+voyages[id].at(-1).at};
}
function shorePosition(session){const w=session.game.world;return w.mode==='native'?w.nativePosition:w.mode==='city'?{...outdoorPoint(session),z:w.z}:null;}
export function ferryOptions(session,now){
 const w=session.game.world,at=shorePosition(session),origin=w.mode==='location'?nativeExit(session)?.city:w.city;
 return Object.values(data.ports).filter(p=>origin&&nativeTownPath(origin,p.city)).map(p=>({id:p.id,name:p.name,city:p.city,vendor:{...p.vendor},dock:{...p.dock},ticket:p.ticket,ticketPrice:p.ticketPrice,tickets:getMaterialCount(session,'l2_'+p.ticket),nearVendor:range(at,p.vendor)<=data.source.vendorInteractionRadius,nearBoarding:range(at,p.dock)<=data.source.boardingRadius,canWalk:['city','native','location'].includes(w.mode)&&(!nativeExit(session)||nativeExit(session).near),...ferryDock(p.id,now)}));
}
export function buyFerryTicket(session,id){
 const port=data.ports[id];if(!port)return {ok:false,reason:'unknown_zone'};
 if(range(shorePosition(session),port.vendor)>data.source.vendorInteractionRadius)return {ok:false,reason:'npc_too_far'};
 if(!(session.game.inventory.gold>=port.ticketPrice))return {ok:false,reason:'not_enough_gold'};
 session.game.inventory.gold-=port.ticketPrice;addMaterial(session,'l2_'+port.ticket);return {ok:true};
}
export function boardFerry(session,id,now){
 const port=data.ports[id],dock=ferryDock(id,now);if(!port||!dock)return {ok:false,reason:'unknown_zone'};
 if(range(shorePosition(session),port.dock)>data.source.boardingRadius)return {ok:false,reason:'ferry_boarding_required'};
 if(!dock.docked)return {ok:false,reason:'ferry_away'};
 return {ok:true,trip:{kind:'ferry',port:id,city:other(id),departureAt:dock.departureAt,until:dock.until,paid:false}};
}
/** Original payForRide charges at departure, not at boarding. */
export function advanceFerry(session,now){
 const w=session.game.world,trip=w.walkHome;if(w.mode!=='road'||trip?.kind!=='ferry')return false;
 if(now>=trip.departureAt&&!trip.paid){
  if(!spendMaterials(session,{['l2_'+data.ports[trip.port].ticket]:1})){
   Object.assign(w,{mode:'native',nativePosition:{...data.ports[trip.port].oust},city:trip.port,path:[]});delete w.walkHome;return false;
  }
  trip.paid=true;
 }
 if(now<trip.until)return false;
 Object.assign(w,{mode:'native',city:trip.city,nativePosition:{...shores.routes[trip.city].to},path:[],pending:null,channel:null});delete w.walkHome;return true;
}
export function leaveFerry(session,now){
 const w=session.game.world,trip=w.walkHome;
 if(w.mode!=='road'||trip?.kind!=='ferry'||now>=trip.departureAt)return {ok:false,reason:'ferry_moving'};
 Object.assign(w,{mode:'native',city:trip.port,nativePosition:{...shores.routes[trip.port].to},path:[]});delete w.walkHome;return {ok:true};
}
export function ferryJourneyPosition(trip,now){
 const frames=trip?.kind==='ferry'&&voyages[trip.port];if(!frames)return null;
 const elapsed=now-trip.departureAt;let index=0;while(index+1<frames.length&&frames[index+1].at<=elapsed)index++;
 const from=frames[index],next=frames[index+1],ratio=next?Math.max(0,(elapsed-from.at)/(next.at-from.at)):0;
 const point=Object.fromEntries(['x','y','z'].map(k=>[k,from.point[k]+(next?next.point[k]-from.point[k]:0)*ratio]));
 return {worldPoint:point,worldPath:elapsed>=0&&next?[{...next.point}]:[],worldMotion:[{point:{...point},afterMs:0},...(elapsed<0?[{point:{...point},afterMs:-elapsed}]:[]),...frames.slice(index+1,index+17).map(f=>({point:{...f.point},afterMs:f.at-elapsed}))],transportPhase:elapsed<0?'waiting':'sailing'};
}
