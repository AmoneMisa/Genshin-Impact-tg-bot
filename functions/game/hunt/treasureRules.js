import DATA from '../../../template/treasureChests.js';
import L2 from '../../../template/l2Classes.js';
import classes from '../../../template/classStatsTemplate.js';
import {roomById} from './huntRooms.js';
import {getZone} from './huntMobs.js';
import {nearestOpenPoint,ROOM_SIZE} from '../world/navigation.js';
export {DATA as TREASURE_DATA};
export const valueAt=(values,level)=>Number(values[Math.min(values.length,Math.max(1,level))-1])||0;
function seed(key){let n=2166136261;for(const c of key)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export const chestId=(group,slot)=>`treasure:h5:${group}:${slot}`;
export const chestSlots=DATA.groups.flatMap(g=>Array.from({length:g.maximumNpc},(_,slot)=>({id:chestId(g.id,slot),group:g,slot})));
export function chestSpawn(slot,cycle){
 const g=slot.group,random=seed(slot.id+':'+cycle),territory=g.territories[random%g.territories.length];
 const pool=g.pool.flatMap(n=>Array.from({length:n.count},()=>n)),npc=pool[seed('npc:'+random)%pool.length],gate=territory.gate;
 if(!gate)return {npc,territory,gate:null};
 const room=roomById(getZone(gate.zone),gate.room,gate.floor);
 const point=nearestOpenPoint({...gate.point,x:Math.max(.1,Math.min(.9,gate.point.x+(slot.slot%2?1:-1)*.12))},room?.walls||[]);
 return {npc,territory,gate:{...gate,point}};
}
export function chestNear(session,spawn){
 const w=session.game.world,f=session.game.hunt?.field,g=spawn.gate;
 return Boolean(g&&w?.mode==='location'&&!w.instanceId&&w.location===g.zone&&session.game.hunt.zone===g.zone&&(f?.floor||1)===g.floor&&f.room===g.room&&Math.hypot(f.x-g.point.x,f.y-g.point.y)<=40/ROOM_SIZE);
}
export function chestLevelAllowed(playerLevel,chestLevel){return Math.abs(playerLevel-chestLevel)<=(playerLevel<=77?6:5);}
export function unlockState(session){
 let id=classes.find(c=>c.name===session.game.gameClass?.stats?.name)?.l2Id;const seen=new Set(),rows=new Map(),level=Number(session.game.stats?.lvl)||1;
 while(id!=null&&!seen.has(id)){
  seen.add(id);for(const r of L2.learn[id]||[])if(r[0]===27)rows.set(r[1],{level:r[1],need:r[2],sp:r[3],items:r[4]||[]});id=L2.classes[id]?.parent;
 }
 const available=[...rows.values()].filter(r=>r.need<=level).sort((a,b)=>a.level-b.level),learned=Math.max(0,Math.min(Number(session.game.l2UtilitySkills?.[27])||0,available.at(-1)?.level||0));
 return {level:learned,next:available.find(r=>r.level>learned)||null,eligible:available.length>0};
}
