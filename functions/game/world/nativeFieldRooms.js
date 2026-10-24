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
