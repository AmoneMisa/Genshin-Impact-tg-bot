import data from '../../../template/nativeMinions.js';
import {nativeActorPoint,nativeFieldBuckets,placeNativeActor} from './nativeFieldSpace.js';
import {buildMob,getZone} from '../hunt/huntMobs.js';
import {nativeStaticSight} from './nativeVisibility.js';
import {nativeGroundAllowed} from './nativeGround.js';

const owner=m=>m.sourceMinion?.owner||`${m.sourceRoom}:${m.sourceSlot}`;
export const sameNativeFamily=(a,b)=>Boolean((a.sourceMinion||b.sourceMinion)&&owner(a)===owner(b));
export const nativeMinionLeader=(actors,minion)=>minion.sourceMinion?actors.find(m=>!m.sourceMinion&&m.currentHp>0&&owner(m)===minion.sourceMinion.owner):null;
/** MinionList.initializeNpc's two inclusive integer rolls and truncations. */
export function nativeMinionProposal(master,radius,random=Math.random){
 master={x:Math.trunc(master.x),y:Math.trunc(master.y),z:Math.trunc(master.z)};
 const minimum=Math.trunc(radius)+data.minimumSpawnRadius,maximum=data.spawnOffsetRadius;
 const integer=(a,b)=>a+Math.floor(random()*(b-a+1));
 let x=integer(minimum*2,maximum*2),y=integer(x,maximum*2);y=Math.trunc(Math.sqrt(y*y-x*x));
 x=x>maximum+minimum?master.x+x-maximum:master.x-x+minimum;
 y=y>maximum+minimum?master.y+y-maximum:master.y-y+minimum;
 return {x,y,z:master.z};
}
/** Each source master spawn gets one attempt per missing private. Failed ground
 * remains an explicit omission, never a made-up nearby replacement or reroll. */
export function syncNativeMinions(session,now,random=Math.random){
 const hunt=session.game.hunt,field=hunt?.field,ids=data.zones[hunt?.zone];if(!field?.native||!ids)return;
 const families=field.native.minionFamilies||={},buckets=nativeFieldBuckets(field),actors=buckets.flatMap(b=>b.mobs||[]);
 for(const master of actors){
  if(master.sourceMinion||master.currentHp<=0||!ids.includes(master.mobId))continue;
  const key=owner(master),config=data.masters[master.mobId];let family=families[key];
  if(family?.epoch===master.instanceId)continue;
  family=families[key]={epoch:master.instanceId,missing:{}};
  const bucket=buckets.find(b=>b.mobs?.includes(master));let slot=0;
  for(const entry of config.entries)for(let i=0;i<entry.count;i++,slot++){
   if(actors.some(m=>m.currentHp>0&&m.sourceMinion?.owner===key&&m.sourceMinion.slot===slot))continue;
   const point=nativeMinionProposal(nativeActorPoint(master),config.collisionRadius,random);
   const actor=buildMob(getZone(hunt.zone),data.actors[entry.id].definition,{now,random,champion:null,className:session.game.gameClass.stats.name});
   Object.assign(actor,{instanceId:`${master.instanceId}:private:${slot}`,sourceRoom:master.sourceRoom,sourceFloor:master.sourceFloor,sourceSlot:`private:${key}:${slot}`,sourceMinion:{owner:key,slot,masterId:master.mobId},sourcePosition:point,sourcePlacement:'minion',sourceRespawnMs:entry.respawnMs,sourceRespawnRandomMs:0,ai:null,aggro:false,buffs:[]});
   if(!placeNativeActor(actor,point)){family.missing[slot]='source_minion_ground_unavailable';continue;}
   // initializeNpc calls spawnMe directly, bypassing Spawn.java's correction.
   actor.native.z=point.z;
   if(!nativeStaticSight(nativeActorPoint(master),nativeActorPoint(actor),{allowed:nativeGroundAllowed})){family.missing[slot]='source_minion_ground_unavailable';continue;}
   bucket.mobs.push(actor);actors.push(actor);
  }
 }
}
