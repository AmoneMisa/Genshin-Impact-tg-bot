/** Population conditions use trusted server state; no request-body stage is read. */
export function hellboundStage(session){return Math.max(0,Math.trunc(Number(session.ownerDocument?.()?.game?.hellbound?.level)||0));}
export function populationSlots(room,session,zoneId){
 let slot=0;const stage=zoneId==='hellbound'?hellboundStage(session):null;
 return (room.spawns||[]).flatMap((entry,entryIndex)=>Array.from({length:entry.count},()=>({...entry,entryIndex,slot:slot++})))
  .filter(s=>stage===null||stage>=(s.hellboundMin??1)&&stage<=(s.hellboundMax??100));
}
export function initialPopulationSlots(room,session,zoneId,random=Math.random){
 const slots=populationSlots(room,session,zoneId),groups=new Map();
 for(const s of slots)if(s.randomGroup){const entries=groups.get(s.randomGroup)||new Set();entries.add(s.entryIndex);groups.set(s.randomGroup,entries);}
 const chosen=new Map([...groups].map(([group,entries])=>{const ids=[...entries];return [group,ids[Math.min(ids.length-1,Math.floor(random()*ids.length))]];}));
 return slots.filter(s=>!s.randomGroup||chosen.get(s.randomGroup)===s.entryIndex);
}
export function populationCapacity(room,session,zoneId){
 const slots=populationSlots(room,session,zoneId),groups=new Map();let fixed=0;
 for(const s of slots){if(!s.randomGroup){fixed++;continue;}const entries=groups.get(s.randomGroup)||new Map();entries.set(s.entryIndex,(entries.get(s.entryIndex)||0)+1);groups.set(s.randomGroup,entries);}
 return fixed+[...groups.values()].reduce((n,entries)=>n+Math.max(...entries.values()),0);
}
export function occupiedPopulationSlots(field,roomId,{pending=true}={}){
 const actors=[...(field.mobs||[]),...Object.values(field.rooms||{}).flatMap(r=>r.mobs||[])];
 return new Set([...actors.filter(m=>m.currentHp>0&&m.sourceRoom===roomId).map(m=>m.sourceSlot),
  ...(pending?(field.respawns||[]).filter(r=>r.room===roomId).map(r=>r.sourceSlot):[])].filter(Number.isInteger));
}
/** undefined = fixed entry; null = lost roll into a full quota; otherwise reserve a replacement. */
export function randomPopulationRespawn(field,mob,room,now,random=Math.random){
 if(!mob.sourceRandomGroup)return undefined;
 const entries=room.spawns.map((s,index)=>({...s,index})).filter(s=>s.randomGroup===mob.sourceRandomGroup);
 if(!entries.length)return null;
 const entry=entries[Math.min(entries.length-1,Math.floor(random()*entries.length))];
 const occupied=occupiedPopulationSlots(field,room.id);
 const slot=populationSlots(room,null,null).find(s=>s.entryIndex===entry.index&&!occupied.has(s.slot));
 if(!slot)return null;
 const min=Math.max(1000,entry.respawnMs-entry.respawnRandomMs),max=Math.max(1000,entry.respawnMs+entry.respawnRandomMs);
 return {room:room.id,sourceSlot:slot.slot,at:now+min+(entry.respawnRandomMs>0?Math.floor(random()*(max-min+1)):0)};
}
