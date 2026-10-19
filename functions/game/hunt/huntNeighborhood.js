import {getZone} from './huntMobs.js';
import {roomLayout} from './huntRooms.js';
import {continuousField} from '../world/continuousField.js';

// Layouts are cached by roomLayout, so the 3x3 window of a cell is stable per (layout, room).
const areas=new WeakMap();

export function neighborhood(hunt){
 const field=hunt?.field;if(!field)return null;
 const zone=getZone(hunt.zone),layout=roomLayout(zone,field.floor||1);
 let byRoom=areas.get(layout);
 if(!byRoom)areas.set(layout,byRoom=new Map());
 if(!byRoom.has(field.room)){
  const current=continuousField(zone,layout)&&layout.rooms.find(r=>r.id===field.room);
  byRoom.set(field.room,current?{zone,layout,current,rooms:layout.rooms.filter(r=>Math.abs(r.col-current.col)<=1&&Math.abs(r.row-current.row)<=1)}:null);
 }
 return byRoom.get(field.room);
}

function projectActor(mob,dx,dy){
 if(dx===0&&dy===0)return mob;
 // Paths remain cell-local and are advanced only on canonical actors by pursueNeighborhood.
 return new Proxy(mob,{
  get(target,key){if(key==='x')return target.x+dx;if(key==='y')return target.y+dy;return Reflect.get(target,key);},
  set(target,key,value){return Reflect.set(target,key,key==='x'?value-dx:key==='y'?value-dy:value);}
 });
}
function projectedWalls(field,area){return area.rooms.flatMap(room=>(room.id===field.room?field.walls||[]:room.walls||[]).map(w=>({...w,x:w.x+room.col-area.current.col,y:w.y+room.row-area.current.row})));}
export function battleWalls(hunt){const area=neighborhood(hunt);return area?projectedWalls(hunt.field,area):hunt?.field?.walls;}

/** Banks keep cell-local canonical actors; projected views never enter a room bank. */
export function battleField(hunt){
 const field=hunt?.field,area=neighborhood(hunt);if(!area)return field;
 const mobs=[];
 for(const room of area.rooms){
  const dx=room.col-area.current.col,dy=room.row-area.current.row;
  for(const mob of room.id===field.room?field.mobs:field.rooms?.[room.id]?.mobs||[]){
   mobs.push(projectActor(mob,dx,dy));
  }
 }
 return {...field,mobs,walls:projectedWalls(field,area)};
}
export function battleActor(hunt,id){
 if(!id||!hunt?.field)return null;
 const field=hunt.field,local=field.mobs.find(m=>m.instanceId===id&&m.currentHp>0);if(local)return local;
 const area=neighborhood(hunt);if(!area)return null;
 for(const room of area.rooms)if(room.id!==field.room){
  const mob=field.rooms?.[room.id]?.mobs.find(m=>m.instanceId===id&&m.currentHp>0);
  if(mob)return projectActor(mob,room.col-area.current.col,room.row-area.current.row);
 }
 return null;
}
export function actorEntries(hunt){
 const field=hunt?.field,area=neighborhood(hunt);if(!area)return [];
 return area.rooms.flatMap(room=>{
  const bucket=room.id===field.room?field.mobs:field.rooms?.[room.id]?.mobs||[];
  return bucket.map(mob=>({room,bucket,mob}));
 });
}
export function removeBattleActor(hunt,id){
 for(const bucket of [hunt.field.mobs,...Object.values(hunt.field.rooms||{}).map(r=>r.mobs||[])]){
  const index=bucket.findIndex(m=>m.instanceId===id);if(index>=0){bucket.splice(index,1);return true;}
 }
 return false;
}

/** First cardinal boundary on a straight segment, including a diagonal neighbour. */
export function firstBoundary(from,to){
 const candidates=[];
 if(to.x<0||to.x>1){const edge=to.x<0?0:1;candidates.push({t:(edge-from.x)/(to.x-from.x),dx:to.x<0?-1:1,dy:0});}
 if(to.y<0||to.y>1){const edge=to.y<0?0:1;candidates.push({t:(edge-from.y)/(to.y-from.y),dx:0,dy:to.y<0?-1:1});}
 const next=candidates.filter(p=>p.t>=0&&p.t<=1).sort((a,b)=>a.t-b.t)[0];if(!next)return null;
 const exit={x:from.x+(to.x-from.x)*next.t,y:from.y+(to.y-from.y)*next.t};
 if(next.dx)exit.x=next.dx>0?1:0;else exit.y=next.dy>0?1:0;
 return {...next,exit,entry:{x:exit.x-next.dx,y:exit.y-next.dy}};
}

/**
 * Makes every cell of the 3x3 window resident. Cells that leave the window drop aggression;
 * cells that enter it start with fresh clocks so no accumulated attacks replay.
 * `populate(zone,room,prefix)` creates a bank of actors for a never-visited cell.
 */
export function syncResidentRooms(hunt,now,populate){
 const field=hunt?.field,area=neighborhood(hunt);if(!field||!area)return false;
 field.rooms??={};
 const active=new Set(area.rooms.map(r=>r.id)),previous=new Set(field.residentRooms||[field.room]);
 for(const id of previous)if(!active.has(id))for(const mob of field.rooms[id]?.mobs||[]){mob.aggro=false;mob.path=[];mob.lastMoveAt=now;}
 for(const room of area.rooms){
  if(room.id!==field.room&&!Object.hasOwn(field.rooms,room.id)){
   field.seq=(Number(field.seq)||0)+1;
   field.rooms[room.id]={mobs:populate(area.zone,room,`${now}:${room.id}:n${field.seq}`)};
  }
  if(!previous.has(room.id))for(const mob of room.id===field.room?field.mobs:field.rooms[room.id].mobs){
   mob.lastMoveAt=now;mob.moveAt=now;mob.path=[];delete mob.destination;
   mob.nextAttackAt=Math.max(mob.nextAttackAt||0,now+mob.attackMs);
  }
 }
 field.residentRooms=[...active];
 return true;
}
