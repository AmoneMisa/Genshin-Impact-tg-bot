import {RAID_LOCATIONS} from '../../../template/raidLocations.js';
import {LOCATION_LEVELS,ZAKEN_SHIP} from '../../../template/locationLevels.js';

export const locationLevels=id=>LOCATION_LEVELS[id]||null;
export const locationLevel=(id,floor=1)=>locationLevels(id)?.floors.find(f=>f.number===floor)||null;
export const levelCount=id=>locationLevels(id)?.floors.length||null;
export const levelOfField=(id,field)=>locationLevel(id,field?.floor||1);

export function levelTransitions(id,field){
 const level=levelOfField(id,field),all=locationLevels(id)?.floors;
 if(!level)return null;
 const destinations=level.transports||all.filter(f=>Math.abs(f.number-level.number)===1).map(f=>({floor:f.number,mode:'walk',...level.stairs[f.number>level.number?'up':'down']}));
 return {title:level.title,
  destinations:destinations.map(endpoint=>({...endpoint,title:all.find(f=>f.number===endpoint.floor).title,near:field.room===endpoint.room&&Math.hypot(field.x-endpoint.point.x,field.y-endpoint.point.y)<=.1})),
  boss:field.room===(level.bossRoom||level.startId)?level.boss||null:null,npcs:level.npcs,raids:Object.values(RAID_LOCATIONS).filter(r=>r.zone===id&&r.gate?.floor===level.number&&r.gate.room===field.room).map(r=>({name:r.name,point:r.gate.point}))};
}

export {ZAKEN_SHIP};
