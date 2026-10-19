import {isBossStunned} from '../boss/bossDebuffs.js';
import {l2HasControl,l2MoveMultiplier} from '../player/l2Effects.js';
import {travelPath} from '../world/navigation.js';
import {planSurfaceApproach,surfaceRouteStep,surfacePathClear} from '../world/surfaceNavigation.js';
import {neighborhood,actorEntries} from './huntNeighborhood.js';
import {clearLine} from './huntSpatial.js';

// Scheduling bound, not an NPC stat: straightforward pursuit never spends a search token.
export const PURSUIT_SEARCHES_PER_TICK=8;
const reset=mob=>{mob.path=[];delete mob.destination;delete mob.pursuit;};
function fingerprint(rooms){
 let value=2166136261;const text=JSON.stringify(rooms.map(r=>[r.id,...r.walls.map(w=>[w.x,w.y,w.w,w.h])]));
 for(let i=0;i<text.length;i++)value=Math.imul(value^text.charCodeAt(i),16777619);
 return value>>>0;
}

/** Move one canonical actor through saved cardinal legs; never clone it into another bank. */
export function pursueNeighborhood(hunt,now){
 const field=hunt.field,area=neighborhood(hunt);if(!area)return false;
 const rooms=area.rooms.map(r=>({...r,walls:(r.id===field.room?field.walls:r.walls)||[]})),byId=new Map(rooms.map(r=>[r.id,r]));
 const layout={rooms},stamp=fingerprint(rooms),goal={x:field.x+area.current.col,y:field.y+area.current.row};
 const projected=new Map(),wallsFor=room=>{
  if(!projected.has(room.id))projected.set(room.id,rooms.flatMap(r=>r.walls.map(w=>({...w,x:w.x+r.col-room.col,y:w.y+r.row-room.row}))));
  return projected.get(room.id);
 };
 const entries=actorEntries(hunt),start=Math.max(0,entries.findIndex(a=>a.mob.instanceId===field.pursuitCursor)),work={remaining:PURSUIT_SEARCHES_PER_TICK,deferred:false};
 let moved=false,pending=null;
 for(let i=0;i<entries.length;i++){
  const index=(start+i)%entries.length,actor=entries[index],mob=actor.mob;
  if(!mob.aggro||mob.currentHp<=0){if(mob.pursuit)reset(mob);continue;}
  const seconds=Math.max(0,Math.min(5,(now-(mob.lastMoveAt??now))/1000));mob.lastMoveAt=now;
  if(isBossStunned(mob,now)||l2HasControl(mob,'Root',now)||l2HasControl(mob,'ImmobileBuff',now)){reset(mob);continue;}
  let room=byId.get(actor.room.id),bucket=actor.bucket;
  const target={x:goal.x-room.col,y:goal.y-room.row},stop=mob.ai==='mage'?.4:.2;
  if(Math.hypot(target.x-mob.x,target.y-mob.y)<=stop+1e-10&&clearLine(mob,target,wallsFor(room))){reset(mob);continue;}
  let budget=seconds*.09*l2MoveMultiplier(mob,now);if(budget<=0)continue;
  let state=mob.pursuit;
  const cached=state&&state.space===hunt.zone&&state.floor===(field.floor||1)&&state.x===goal.x&&state.y===goal.y&&state.stop===stop&&state.stamp===stamp&&state.room===room.id&&(state.blocked||mob.path?.length||state.crossing);
  if(!cached||!state.blocked&&!surfacePathClear(mob,mob.path||[],wallsFor(room))){
   work.deferred=false;const plan=planSurfaceApproach({x:mob.x,y:mob.y,walls:room.walls},target,stop,layout,room,work);
   if(work.deferred){reset(mob);pending??=mob.instanceId;continue;}
   state=mob.pursuit={space:hunt.zone,floor:field.floor||1,x:goal.x,y:goal.y,stop,stamp,room:room.id,blocked:!plan,crossing:plan?.crossing||null};
   mob.path=plan?.path||[];delete mob.destination;
  }
  if(state.blocked)continue;
  for(let hop=0;budget>0&&hop<64;hop++){
   if(!surfacePathClear(mob,mob.path,wallsFor(room))){reset(mob);break;}
   const before={x:mob.x,y:mob.y};budget=travelPath(mob,budget);mob.moveAt=now;
   moved||=Math.hypot(mob.x-before.x,mob.y-before.y)>1e-10;
   if(mob.path.length)break;
   const crossing=state.crossing;if(!crossing){reset(mob);break;}
   const next=byId.get(crossing.room),leg=crossing.route?.[0];
   if(!next||!leg||Math.abs(next.col-room.col)+Math.abs(next.row-room.row)!==1||Math.hypot(mob.x-crossing.exit.x,mob.y-crossing.exit.y)>1e-7||!surfacePathClear(crossing.entry,leg.path,wallsFor(next))){reset(mob);break;}
   const position=bucket.indexOf(mob);if(position<0){reset(mob);break;}
   bucket.splice(position,1);Object.assign(mob,crossing.entry);room=next;
   bucket=room.id===field.room?field.mobs:(field.rooms[room.id]||={mobs:[]}).mobs;bucket.push(mob);
   const step=surfaceRouteStep(crossing.route);mob.path=step.path;state.crossing=step.crossing;state.room=room.id;
  }
 }
 if(pending)field.pursuitCursor=pending;else delete field.pursuitCursor;
 return moved;
}
