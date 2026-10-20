import nativeWorld from '../../template/nativeWorld.js';
import {CITIES,CITY_NPCS} from '../../template/worldMap.js';

export const TOWN_LINKS=[['gludio','gludin'],['gludio','dion'],['dion','floran'],['dion','giran'],['giran','heine'],['giran','oren'],['oren','hunters'],['hunters','aden'],['aden','goddard']];
// Adjacent source regions cover mountain/river detours for the three narrow rectangles.
export const TOWN_DETOUR_REGIONS=['18_23','19_23','21_20','21_21','23_16','23_17','23_21','25_16','25_17'];
export const TOWN_ANCHORS=Object.fromEntries([...new Set(TOWN_LINKS.flat())].map(id=>{
 const city=CITIES.find(c=>c.id===id),npc=nativeWorld.towns[id]||CITY_NPCS.filter(n=>n.city===id&&n.npcId&&n.source&&Number.isFinite(n.z)).sort((a,b)=>Math.hypot(a.x-city.x,a.y-city.y)-Math.hypot(b.x-city.x,b.y-city.y))[0];
 if(!npc)throw new Error('No original town anchor: '+id);
 return [id,{npcId:npc.npcId,name:npc.name,x:npc.x,y:npc.y,z:npc.z,file:npc.file||npc.source}];
}));
