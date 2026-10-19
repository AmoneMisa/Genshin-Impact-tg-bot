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
export function graciaTownQuote(session,target,now=Date.now()){
 const from=session.game.world?.city,arrival=GRACIA_CITIES.find(c=>c.id===target);
 if(target===PORT&&['gludio','talking-island-village'].includes(from))return {mode:'teleport',gold:0,fee:0,item:57,...arrival};
 if(target===PORT&&GRACIA_NPCS.some(n=>n.city===from&&n.service==='survivor'))return Number(session.game.stats?.lvl)>=75?{mode:'teleport',gold:150000,fee:150000,item:57,npc:from+':gracia-survivor',fixedFee:true,...arrival}:null;
 if(!(from===PORT&&target===BASE||from===BASE&&target===PORT))return null;
 const direction=from===PORT,offset=direction?60000:outward+120000,cycle=AIRSHIP_SCHEDULE.cycleMs;
 const departure=Math.ceil((now-offset)/cycle)*cycle+offset;
 return {mode:'airship',gold:0,npc:GRACIA_NPCS.find(n=>n.city===from&&n.service==='airship')?.id,departureAt:departure,until:departure+(direction?outward:inward),arrivalPoint:direction?{x:-186563,y:243590,z:2608}:{x:-149379,y:255246,z:-80},...arrival};
}
