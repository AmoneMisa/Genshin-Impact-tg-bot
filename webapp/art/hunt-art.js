import {MOB_ARCHETYPE} from './hunt-mob-mapping.js';
export const HUNT_ZONE_ART=Object.freeze(['ng-d','c','b','a','s','s80','s84','hellbound']);
export const HUNT_MOB_ART=Object.freeze(["beast","orc","undead","insect","lizardman","golem","bandit","plant","demon","dragon","spirit","giant"]);
export function huntZoneBand(zone){
 if(zone?.kind==='catacomb'||zone?.id?.startsWith('catacomb-'))return 'catacombs';
 if(zone?.id==='hellbound')return 'hellbound';
 const level=Number(zone?.level)||1;
 return level>=84?'s84':level>=80?'s80':level>=76?'s':level>=61?'a':level>=52?'b':level>=40?'c':'ng-d';
}
export function huntZoneUrl(zone,size=480){const band=huntZoneBand(zone);return band==='catacombs'||HUNT_ZONE_ART.includes(band)?`/art/hunt/zones/${band}-${size===960?960:480}.webp`:null;}
export function huntMobUrl(mob,size=128){const archetype=MOB_ARCHETYPE[String(mob?.id||mob?.mobId||'')]||({'Целитель':'spirit','Маг':'demon','Воин':'undead'}[mob?.role]);return HUNT_MOB_ART.includes(archetype)?`/art/hunt/mobs/${archetype}-${size===256?256:128}.webp`:null;}
