import rules from '../../../template/nativeWaterRules.js';
import classes from '../../../template/classStatsTemplate.js';
import {resolveClassName} from '../classes/legacyClasses.js';
import {nativePassiveStat} from '../player/passiveSkills.js';
import {l2RawStat,l2HasControl} from '../player/l2Effects.js';
import getMaxHp from '../player/getters/getMaxHp.js';
import getEquipStat from '../player/getters/getEquipStatByName.js';
import {recordDeath} from '../player/deathPenalties.js';
import {nativeInWater,nativeWaterSpans,nativeWaterSurface} from './nativeWaterGeometry.js';

export const nativeWaterBody=session=>rules.players[classes.find(c=>c.name===resolveClassName(session.game.gameClass?.stats?.name))?.l2Id]||null;
export function nativeWaterStat(session,stat,base,now){
 return Math.max(0,base*nativePassiveStat(session,stat,true)*l2RawStat(session,stat,true,now)+nativePassiveStat(session,stat)+l2RawStat(session,stat,false,now));
}
export const nativeSwimSpeed=(session,now,running=true)=>{const body=nativeWaterBody(session);return body?Math.max(0,((running?body.fastSwim:body.slowSwim)+getEquipStat(session,'speed',false,undefined,now))*getEquipStat(session,'speedMul',true,undefined,now)):0;};
export const nativeBreathDuration=(session,now)=>{const body=nativeWaterBody(session);return body?Math.trunc(rules.baseBreathMs*nativeWaterStat(session,'breath',body.breath,now)/rules.breathDivisor):null;};
/** The source task is started once on entry. Buff changes do not restart it. */
export function advanceNativeWater(session,now,inside){
 const world=session.game.world,stats=session.game.gameClass?.stats;if(!world||!stats)return;
 let task=world.waterTask;
 if(task){
  // At most one span per effect expiry, regardless of time offline. Adjacent
  // water volumes keep the original task and do not replenish its gauge.
  while(task.nextAt<=now&&stats.hp>0){
   const at=task.nextAt,boundary=Math.min(Infinity,...(session.game.effects||[]).map(e=>Number(e.until)).filter(t=>t>at));
   const available=Math.floor((now-at)/rules.damageIntervalMs)+1,count=Math.min(available,Number.isFinite(boundary)?Math.ceil((boundary-at)/rules.damageIntervalMs):available);
   const damage=Math.max(rules.minimumDamage,getMaxHp(session)/rules.damageHpDivisor);
   if(!l2HasControl(session,'Invincible',at)){
    const applied=Math.min(count,Math.ceil(stats.hp/damage));stats.hp=Math.max(0,stats.hp-applied*damage);
    world.lastWaterDamage={at:at+(applied-1)*rules.damageIntervalMs,damage:applied*damage};
    if(stats.hp<=0){const deathAt=world.lastWaterDamage.at;session.game.respawnTime=deathAt+60000;recordDeath(session,{now:deathAt,kind:'mob'});world.waterDeathAt=deathAt;}
   }
   task.nextAt+=count*rules.damageIntervalMs;session.needsSave=true;
  }
 }
 if(!inside||stats.hp<=0){if(world.waterTask){delete world.waterTask;session.needsSave=true;}return;}
 if(!world.waterTask){const duration=nativeBreathDuration(session,now);if(duration===null)return;world.waterTask={enteredAt:now,duration,nextAt:now+duration};session.needsSave=true;}
}
/** Called for the actual travelled segment, before switching maps or banks. */
export function advanceNativeWaterSegment(session,from,to,startAt,endAt){
 const spans=nativeWaterSpans(from,to);if(!spans||endAt<startAt)return;
 for(const span of spans){
  const start=startAt+(endAt-startAt)*span.start,end=startAt+(endAt-startAt)*span.end;
  advanceNativeWater(session,start,span.water);advanceNativeWater(session,end,span.water);
  if(session.game.gameClass?.stats?.hp<=0)return session.game.world.waterDeathAt;
 }
 advanceNativeWater(session,endAt,nativeInWater(to));
}
export function nativeWaterDto(session,now,point){
 if(!point||!nativeInWater(point)&&!nativeWaterSurface(point))return null;
 const task=session.game.world?.waterTask;
 return {swimming:nativeInWater(point),atSurface:nativeWaterSurface(point),depth:session.game.world?.waterDepth||'level',breathMs:task?Math.max(0,task.enteredAt+task.duration-now):nativeBreathDuration(session,now),breathMaxMs:task?.duration??nativeBreathDuration(session,now)};
}
