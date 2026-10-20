import {GRACIA_CITIES,GRACIA_NPCS,AIRSHIP_PATHS} from '../../../template/graciaTravel.js';
const PORT='gludio-airship-field',BASE='keucereus-alliance-base';
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
function legDuration(name,start){
 let previous=start,total=0;
 for(const row of AIRSHIP_PATHS[name]){const speed=row.length>3?row[3]:350;if(speed>0)total+=distance(previous,row)/speed*1000;previous=row;}
 return Math.ceil(total);
}
const outward=legDuration('GLUDIO_TO_WARPGATE',[-149378,252552,198])+5000+legDuration('WARPGATE_TO_GRACIA',AIRSHIP_PATHS.GLUDIO_TO_WARPGATE.at(-1));
const inward=legDuration('GRACIA_TO_WARPGATE',AIRSHIP_PATHS.WARPGATE_TO_GRACIA.at(-1))+5000+legDuration('WARPGATE_TO_GLUDIO',AIRSHIP_PATHS.GRACIA_TO_WARPGATE.at(-1));
export const AIRSHIP_SCHEDULE=Object.freeze({outwardMs:outward,inwardMs:inward,dockMs:60000,cycleMs:outward+inward+120000,sourceSpeed:350});
const xyz=row=>({x:row[0],y:row[1],z:row[2]});
function flight(first,second,start){
 const frames=[{point:xyz(start),at:0}];let at=0,previous=start;
 for(const name of [first,second]){
  if(name===second){at+=5000;frames.push({point:xyz(previous),at});}
  const startAt=at;let duration=0;
  for(const row of AIRSHIP_PATHS[name]){
   const speed=row.length>3?row[3]:350;
   // A zero-speed VehiclePathPoint teleports the ship; it is not a flight leg.
   if(speed>0)duration+=distance(previous,row)/speed*1000;
   frames.push({point:xyz(row),at:startAt+Math.ceil(duration)});previous=row;
  }
  // Keep the existing server schedule's per-path millisecond rounding.
  at=startAt+Math.ceil(duration);frames.at(-1).at=at;
 }
 return frames;
}
const FLIGHTS={
 [BASE]:flight('GLUDIO_TO_WARPGATE','WARPGATE_TO_GRACIA',[-149378,252552,198]),
 [PORT]:flight('GRACIA_TO_WARPGATE','WARPGATE_TO_GLUDIO',AIRSHIP_PATHS.WARPGATE_TO_GRACIA.at(-1))
};
/** Derive transport position from server time; never use character speed or ground NSWE. */
export function airshipJourneyPosition(trip,now){
 const frames=trip?.kind==='airship'&&FLIGHTS[trip.city];
 if(!frames||!Number.isFinite(trip.departureAt))return null;
 const elapsed=now-trip.departureAt;let index=0;
 while(index+1<frames.length&&frames[index+1].at<=elapsed)index++;
 const from=frames[index],next=frames[index+1];let point={...from.point};
 if(next&&elapsed>from.at){const ratio=(elapsed-from.at)/(next.at-from.at);point=Object.fromEntries(['x','y','z'].map(k=>[k,from.point[k]+(next.point[k]-from.point[k])*ratio]));}
 const worldMotion=[{point:{...point},afterMs:0},...(elapsed<0?[{point:{...point},afterMs:-elapsed}]:[]),...frames.slice(index+1).map(frame=>({point:{...frame.point},afterMs:frame.at-elapsed}))];
 // Draw only the current physical leg. A warp must never look like a traversable road.
 const moving=next&&elapsed>=0&&next.at>from.at&&Math.hypot(next.point.x-from.point.x,next.point.y-from.point.y,next.point.z-from.point.z)>0;
 return {worldPoint:point,worldPath:moving?[{...next.point}]:[],worldMotion,transportPhase:elapsed<0?'waiting':moving?'flying':'warpgate'};
}
export function graciaTownQuote(session,target,now=Date.now()){
 const from=session.game.world?.city,arrival=GRACIA_CITIES.find(c=>c.id===target);
 if(target===PORT&&['gludio','talking-island-village'].includes(from))return {mode:'teleport',gold:0,fee:0,item:57,...arrival};
 if(target===PORT&&GRACIA_NPCS.some(n=>n.city===from&&n.service==='survivor'))return Number(session.game.stats?.lvl)>=75?{mode:'teleport',gold:150000,fee:150000,item:57,npc:from+':gracia-survivor',fixedFee:true,...arrival}:null;
 if(!(from===PORT&&target===BASE||from===BASE&&target===PORT))return null;
 const direction=from===PORT,offset=direction?60000:outward+120000,cycle=AIRSHIP_SCHEDULE.cycleMs;
 const departure=Math.ceil((now-offset)/cycle)*cycle+offset;
 return {mode:'airship',gold:0,npc:GRACIA_NPCS.find(n=>n.city===from&&n.service==='airship')?.id,departureAt:departure,until:departure+(direction?outward:inward),arrivalPoint:direction?{x:-186563,y:243590,z:2608}:{x:-149379,y:255246,z:-80},...arrival};
}
