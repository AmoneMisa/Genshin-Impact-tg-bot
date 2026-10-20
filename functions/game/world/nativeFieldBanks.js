import {deflateSync,inflateSync} from 'node:zlib';
import {roomById} from '../hunt/huntRooms.js';
import {getZone} from '../hunt/huntMobs.js';

/** Server-only snapshots keep native trail departure/return from rerolling the hunting room. */
export function saveNativeField(session,now){
 const hunt=session.game.hunt;if(!hunt?.field)return;
 const banks=session.game.world.nativeFields||={};
 banks[hunt.zone]={at:now,data:deflateSync(Buffer.from(JSON.stringify(hunt.field))).toString('base64')};
}
export function restoreNativeField(session,id,now){
 const saved=session.game.world.nativeFields?.[id];if(!saved)return false;
 let field;try{field=JSON.parse(inflateSync(Buffer.from(saved.data,'base64'),{maxOutputLength:2*1024*1024}).toString());}catch{return false;}
 if(!roomById(getZone(id),field.room,field.floor||1))return false;
 field.path=[];field.seenAt=now;field.moveAt=now;
 delete field.crossing;delete field.pendingRoom;delete field.action;delete field.autoAttack;
 for(const mob of [field,...Object.values(field.rooms||{})].flatMap(r=>r.mobs||[])){
  mob.aggro=false;mob.path=[];mob.lastMoveAt=now;mob.nextAttackAt=now+mob.attackMs;delete mob.pursuit;
 }
 session.game.hunt.field=field;
 session.game.hunt.mob=field.mobs.find(m=>m.instanceId===field.target)||null;
 return true;
}
