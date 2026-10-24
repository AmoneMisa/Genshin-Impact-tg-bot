import {deflateSync,inflateSync} from 'node:zlib';
import {roomById} from '../hunt/huntRooms.js';
import {getZone} from '../hunt/huntMobs.js';
import {LOCATIONS} from '../../../template/worldMap.js';

const publicFloor=(id,floor)=>id==='devils-isle'?floor<4:LOCATIONS.find(l=>l.id===id)?.access?.kind==='seed-instance'?floor===1:true;
const publicFloors=(id,banks)=>Object.fromEntries(Object.entries(banks||{}).filter(([floor])=>publicFloor(id,Number(floor))));

/** Public-space snapshots survive every Atlas departure, including underground links.
 * Instanced populations belong to their instance and must never enter this cache.
 */
export function saveNativeField(session,now,hunt=session.game.hunt){
 if(!hunt?.field||!getZone(hunt.zone)||getZone(hunt.zone).instance||session.game.world?.instanceId||!publicFloor(hunt.zone,hunt.field.floor||1))return;
 const banks=session.game.world.nativeFields||={};
 banks[hunt.zone]={at:now,data:deflateSync(Buffer.from(JSON.stringify({...hunt.field,floorStates:publicFloors(hunt.zone,hunt.field.floorStates)}))).toString('base64')};
}
export function restoreNativeField(session,id,now){
 if(getZone(id)?.instance)return false;
 const saved=session.game.world.nativeFields?.[id];if(!saved)return false;
 let field;try{field=JSON.parse(inflateSync(Buffer.from(saved.data,'base64'),{maxOutputLength:2*1024*1024}).toString());}catch{return false;}
 if(!publicFloor(id,field.floor||1))return false;
 field.floorStates=publicFloors(id,field.floorStates);
 if(!roomById(getZone(id),field.room,field.floor||1))return false;
 const entry=session.game.hunt.field;
 if(!field.native){
 if((field.floor||1)!==(entry.floor||1)){
  const snapshot=f=>Object.fromEntries(['mobs','room','rooms','respawns','visited','walls','target','seq','levelVersion'].map(k=>[k,f[k]]));
  const banks=field.floorStates||={};banks[field.floor||1]=snapshot(field);
  Object.assign(field,banks[entry.floor||1]||snapshot(entry));delete banks[entry.floor||1];
 }
 if(field.room!==entry.room){
  field.rooms||={};field.rooms[field.room]={mobs:field.mobs};
  field.mobs=field.rooms[entry.room]?.mobs||entry.mobs;delete field.rooms[entry.room];
 }
 Object.assign(field,{room:entry.room,floor:entry.floor,x:entry.x,y:entry.y,walls:entry.walls});
 if(!field.visited.includes(entry.room))field.visited.push(entry.room);
 }
 if(field.native)delete field.native.journey;
 field.path=[];field.seenAt=now;field.moveAt=now;
 delete field.crossing;delete field.pendingRoom;delete field.action;delete field.autoAttack;
 for(const bank of [field,...Object.values(field.floorStates||{})])for(const mob of [bank,...Object.values(bank.rooms||{})].flatMap(r=>r.mobs||[])){
  mob.aggro=false;mob.path=[];mob.lastMoveAt=now;mob.nextAttackAt=now+mob.attackMs;delete mob.pursuit;
  if(mob.native){delete mob.native.journey;delete mob.native.following;delete mob.native.destination;}
 }
 session.game.hunt.field=field;
 session.game.hunt.mob=field.mobs.find(m=>m.instanceId===field.target)||null;
 delete session.game.world.nativeFields[id];
 return true;
}
