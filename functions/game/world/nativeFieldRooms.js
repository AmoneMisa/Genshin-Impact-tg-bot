import pilot from '../../../template/nativeFieldPilot.js';
import {LOCATION_LEVELS} from '../../../template/locationLevels.js';
const cache=new Map();
/** The floor prefix owns slots; it never changes source XY/Z or physical layers. */
export function nativeFieldRooms(id){
 if(cache.has(id))return cache.get(id);
 const meta=pilot.fields[id],floors=meta?.floors||[1],multi=Boolean(meta?.floors);
 const rooms=(LOCATION_LEVELS[id]?.floors||[]).filter(f=>floors.includes(f.number)).flatMap(f=>f.rooms.map(r=>multi?{...r,id:`f${f.number}/${r.id}`,sourceFloor:f.number,walls:[]}:r));
 cache.set(id,rooms);return rooms;
}
export function nativeSourceRoom(id,key){return pilot.fields[id]?.floors&&/^f\d+\/r\d+c\d+$/.test(key)?nativeFieldRooms(id).find(r=>r.id===key)||null:null;}
export function migrateNativeRoomBanks(field,id){
 const floors=pilot.fields[id]?.floors;if(!floors||field.native.roomKeysVersion===1)return;
 const banks={},respawns=[],visited=new Set(),originalFloor=field.floor||1;
 const tag=(floor,room)=>`f${floor}/${room}`;
 let seq=field.seq||0;
 for(const [floor,bank] of [[originalFloor,field],...Object.entries(field.floorStates||{}).map(([n,b])=>[Number(n),b])]){
  if(!floors.includes(floor))continue;seq=Math.max(seq,bank.seq||0);
  for(const [room,bucket] of [[bank.room,bank],...Object.entries(bank.rooms||{})]){
   for(const actor of bucket.mobs||[]){
    actor.sourceRoom=tag(floor,actor.sourceRoom||room);actor.sourceFloor=floor;
    (banks[actor.sourceRoom]||={mobs:[]}).mobs.push(actor);
   }
  }
  for(const entry of bank.respawns||[])respawns.push({...entry,room:tag(floor,entry.room),sourceFloor:floor});
  for(const room of bank.visited||[])visited.add(tag(floor,room));
 }
 const room=tag(originalFloor,field.room);
 Object.assign(field,{floor:1,room,mobs:banks[room]?.mobs||[],rooms:banks,respawns,visited:[...visited],floorStates:{},seq});delete banks[room];
 Object.assign(field.native,{roomKeysVersion:1,sourceFloor:originalFloor});
}
/** Old catalogs sometimes omitted selection=random. Keep an existing variant,
 * its HP and timers instead of rerolling or retaining every alternative. Runs
 * only while adopting a legacy bank; correctly tagged mixed respawns survive. */
export function migrateNativeRandomGroups(field,id){
 for(const room of nativeFieldRooms(id)){
  const slots=[];let index=0;
  for(const [entryIndex,entry] of (room.spawns||[]).entries())for(let n=0;n<entry.count;n++)slots[index++]={...entry,entryIndex};
  const banks=[field,...Object.values(field.rooms||{})],actors=banks.flatMap(b=>b.mobs||[]).filter(m=>m.sourceRoom===room.id);
  const untagged=actors.filter(m=>slots[m.sourceSlot]?.randomGroup&&!m.sourceRandomGroup),choices=new Map();
  for(const m of untagged){const slot=slots[m.sourceSlot];if(!choices.has(slot.randomGroup))choices.set(slot.randomGroup,slot.entryIndex);}
  if(!choices.size)continue;
  const keep=slot=>!slot?.randomGroup||!choices.has(slot.randomGroup)||choices.get(slot.randomGroup)===slot.entryIndex;
  for(const bank of banks)bank.mobs=(bank.mobs||[]).filter(m=>{
   if(m.sourceRoom!==room.id)return true;const slot=slots[m.sourceSlot];if(!keep(slot))return false;
   if(slot?.randomGroup)m.sourceRandomGroup=slot.randomGroup;return true;
  });
  field.respawns=(field.respawns||[]).filter(r=>r.room!==room.id||keep(slots[r.sourceSlot]));
 }
}
