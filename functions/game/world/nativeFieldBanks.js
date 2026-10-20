import {deflateSync,inflateSync} from 'node:zlib';
import {roomById} from '../hunt/huntRooms.js';
import {getZone} from '../hunt/huntMobs.js';
import routes from '../../../template/nativeRoutes.js';
import islands from '../../../template/nativeIslandRoutes.js';

/** Server-only snapshots keep native trail departure/return from rerolling the hunting room. */
export function saveNativeField(session,now,hunt=session.game.hunt){
 if(!hunt?.field||!(routes.routes[hunt.zone]?.available||islands.routes[hunt.zone]?.available))return;
 const banks=session.game.world.nativeFields||={};
 banks[hunt.zone]={at:now,data:deflateSync(Buffer.from(JSON.stringify(hunt.field))).toString('base64')};
}
export function restoreNativeField(session,id,now){
 const saved=session.game.world.nativeFields?.[id];if(!saved)return false;
 let field;try{field=JSON.parse(inflateSync(Buffer.from(saved.data,'base64'),{maxOutputLength:2*1024*1024}).toString());}catch{return false;}
 if(!roomById(getZone(id),field.room,field.floor||1))return false;
 const entry=session.game.hunt.field;
 if(field.room!==entry.room){
  field.rooms||={};field.rooms[field.room]={mobs:field.mobs};
  field.mobs=field.rooms[entry.room]?.mobs||entry.mobs;delete field.rooms[entry.room];
 }
 Object.assign(field,{room:entry.room,floor:entry.floor,x:entry.x,y:entry.y,walls:entry.walls});
 if(!field.visited.includes(entry.room))field.visited.push(entry.room);
 field.path=[];field.seenAt=now;field.moveAt=now;
 delete field.crossing;delete field.pendingRoom;delete field.action;delete field.autoAttack;
 for(const mob of [field,...Object.values(field.rooms||{})].flatMap(r=>r.mobs||[])){
  mob.aggro=false;mob.path=[];mob.lastMoveAt=now;mob.nextAttackAt=now+mob.attackMs;delete mob.pursuit;
 }
 session.game.hunt.field=field;
 session.game.hunt.mob=field.mobs.find(m=>m.instanceId===field.target)||null;
 delete session.game.world.nativeFields[id];
 return true;
}
