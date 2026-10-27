import data from '../../../template/paganKeys.js';
import classStats from '../../../template/classStatsTemplate.js';
import {resolveClassName} from '../classes/legacyClasses.js';
import {getMaterialCount,spendMaterials} from '../player/materials.js';
import {l2ActionBlock} from '../player/l2Effects.js';
import {nativeActorPoint} from './nativeFieldSpace.js';
import {nativeOpenDoors,nativeDoorStore,openNativeDoors,syncNativeDoors} from './nativeDoorContext.js';
import {nativeGroundFor} from './nativeGround.js';
import {findNativePath} from './nativeNavigation.js';
import {createNativeJourney} from './nativeJourney.js';
import {worldGeodata} from './l2jGeodata.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const field=s=>s.game.world?.mode==='location'&&s.game.world.location==='pagan-temple'&&!s.game.world.instanceId&&s.game.hunt?.zone==='pagan-temple'&&s.game.hunt.field?.native?s.game.hunt.field:null;
const radius=s=>data.playerRadii[classStats.find(c=>c.name===resolveClassName(s.game.gameClass?.stats?.name))?.l2Id];
const title=id=>Number(id)<=19160009?'Дверь коридора':Number(id)<=19160011?'Врата святилища':Number(id)<=19160013?'Потайная дверь':'Дверь алтаря';
function rule(s,itemId,doorId){
 const f=field(s),key=data.keys[itemId],door=data.doors[doorId],r=radius(s);
 return f&&key&&door&&key.doorIds.includes(Number(doorId))&&Number.isFinite(r)?{f,key,door,r,point:nativeActorPoint(f)}:null;
}
/** The player selects original IDs only; item, range and cast timing are pinned. */
export function beginNativeDoorKey(session,itemId,doorId,now){
 const ctx=rule(session,itemId,doorId);if(!ctx)return {ok:false,reason:'invalid_action'};
 const {f,key,door,r,point}=ctx;
 if(f.action||session.game.world.channel||session.game.sitting||session.game.storeMode)return {ok:false,reason:'npc_interaction_blocked'};
 const denied=l2ActionBlock(session,{magic:false},now);if(denied)return {ok:false,reason:denied};
 // The pinned Player.checkUseMagicCondition deliberately tests 2D distance for
 // a Door target. GeoEngine.canSeeTarget has a separate Door exception.
 if(distance(point,door.point)>key.range+r)return {ok:false,reason:'door_too_far'};
 if((session.game.world.nativeKeyCooldowns?.[key.skillId]||0)>now)return {ok:false,reason:'cooldown'};
 if(!spendMaterials(session,{['l2_'+itemId]:key.consume}))return {ok:false,reason:'pagan_key_required'};
 (session.game.world.nativeKeyCooldowns||={})[key.skillId]=now+key.reuseMs;
 session.needsSave=true;
 return {ok:true,action:{kind:'door-key',phase:'cast',name:key.name,itemId:Number(itemId),doorId:Number(doorId),startedAt:now,until:now+key.hitMs}};
}
export function advanceNativeDoorKey(session,now){
 const f=field(session),cast=f?.action;if(cast?.kind!=='door-key')return;
 const ctx=rule(session,cast.itemId,cast.doorId);
 if(!ctx||session.game.gameClass.stats.hp<=0||l2ActionBlock(session,{magic:false},now)){delete f.action;return;}
 if(now<cast.until)return;
 delete f.action;
 if(distance(ctx.point,ctx.door.point)>ctx.key.effectRange)return;
 const group=ctx.door.group?Object.entries(data.doors).filter(([,d])=>d.group===ctx.door.group).map(([id])=>Number(id)):[cast.doorId];
 openNativeDoors(session,{doorIds:group,openMs:ctx.door.closeMs},cast.until);syncNativeDoors(session,now);
}
/** At most two nearby source doors, with the real carried keys as choices. */
export function nativeDoorKeyOptions(session,now){
 const f=field(session),r=radius(session);if(!f||!Number.isFinite(r))return [];
 const point=nativeActorPoint(f),open=nativeOpenDoors(nativeDoorStore(session),now);
 const groups=new Set();
 return Object.entries(data.doors).map(([id,d])=>({id,door:d,distance:distance(point,d.point)})).filter(d=>d.distance<=2048&&!open.has(d.id)).sort((a,b)=>a.distance-b.distance).filter(d=>{if(!d.door.group)return true;if(groups.has(d.door.group))return false;groups.add(d.door.group);return true;}).slice(0,2).flatMap(d=>{
  const compatible=Object.entries(data.keys).filter(([,k])=>k.doorIds.includes(Number(d.id))),carried=compatible.filter(([id,k])=>getMaterialCount(session,'l2_'+id)>=k.consume),keys=carried.length?carried:compatible.slice(0,1);
  return keys.map(([id,k])=>({doorId:Number(d.id),itemId:Number(id),title:title(d.id),keyName:k.name,near:d.distance<=k.range+r,enabled:getMaterialCount(session,'l2_'+id)>=k.consume&&!f.action&&!session.game.world.channel&&!session.game.sitting&&!session.game.storeMode&&(session.game.world.nativeKeyCooldowns?.[k.skillId]||0)<=now}));
 });
}
/** Approach points are derived cell proposals beside the real door, never NPC spawns. */
export function nativeDoorKeyGuide(session,itemId,doorId,now,speed){
 const ctx=rule(session,itemId,doorId);if(!ctx)return {ok:false,reason:'invalid_action'};
 if(!getMaterialCount(session,'l2_'+itemId))return {ok:false,reason:'pagan_key_required'};
 const {point,key,door,r}=ctx;if(distance(point,door.point)<=key.range+r)return {ok:false,reason:'npc_already_near'};
 if(distance(point,door.point)>8192)return {ok:false,reason:'door_too_far'};
 const allowed=nativeGroundFor(session,now),candidates=[];
 for(let i=0;i<16;i++){
  const angle=i*Math.PI/8,reach=key.range+r-1,p=worldGeodata.point({x:Math.trunc(door.point.x+Math.cos(angle)*reach),y:Math.trunc(door.point.y+Math.sin(angle)*reach),z:point.z});
  if(p?.nswe&&allowed(p)&&distance(p,door.point)<=key.range+r)candidates.push(p);
 }
 candidates.sort((a,b)=>distance(point,a)-distance(point,b));
 for(const to of candidates){
  const plan=findNativePath(point,to,{allowed,stride:2,maxNodes:6000,margin:128,heuristicWeight:2,reversible:true});if(!plan.ok)continue;
  const trip=createNativeJourney(plan.start,plan.path,{now,speed,allowed});if(trip){trip.native.historyStart={...plan.start};return {ok:true,trip};}
 }
 return {ok:false,reason:'path_blocked'};
}
