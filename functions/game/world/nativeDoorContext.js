import pagan from '../../../template/paganAccess.js';
import keys from '../../../template/paganKeys.js';

const known=new Set([...pagan.doors.flatMap(d=>d.doorIds.map(String)),...Object.keys(keys.doors)]);
// A chat owns shared world events; standalone sessions use their persisted world.
export function nativeDoorStore(session){
 const owner=session.ownerDocument?.()?.game||session.game.world||session.game;
 return owner.nativeDoors||={};
}
export function nativeOpenDoors(records,now){
 return new Set(Object.entries(records||{}).filter(([id,r])=>{
  if(!known.has(id)||!Number.isFinite(r?.openedAt)||r.openedAt>now)return false;
  if(r.until===null)return keys.doors[id]?.closeMs===null;
  return Number.isFinite(r.until)&&now<r.until&&r.until>r.openedAt&&r.until-r.openedAt<=(keys.doors[id]?.closeMs??10000);
 }).map(([id])=>id));
}
export function openNativeDoors(session,rule,now){
 const records=nativeDoorStore(session);
 for(const id of rule.doorIds){
  const old=records[id];
  if(Number.isFinite(old?.openedAt)&&old.openedAt>now)continue;
  // The source's pending CLOSE_DOOR timer is not prolonged by another talk.
  if(!nativeOpenDoors({[id]:old},now).has(String(id)))records[id]={openedAt:now,until:rule.openMs===null?null:now+rule.openMs};
 }
 session.needsSave=true;
 session.ownerDocument?.()?.markModified?.('game.nativeDoors');
}
export function syncNativeDoors(session,now){
 const field=session.game.hunt?.field;if(!field?.native)return;
 const records=nativeDoorStore(session);
 for(const actor of [field,...[field,...Object.values(field.rooms||{})].flatMap(b=>b.mobs||[])])if(actor.native){
  actor.native.doorClock=now;actor.native.doors=records;
 }
}
