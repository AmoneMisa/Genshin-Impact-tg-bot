import rules from '../../../template/nativeFallRules.js';
import classes from '../../../template/classStatsTemplate.js';
import {resolveClassName} from '../classes/legacyClasses.js';
import getMaxHp from '../player/getters/getMaxHp.js';
import {nativePassiveStat} from '../player/passiveSkills.js';
import {l2RawStat,l2HasControl} from '../player/l2Effects.js';

export const nativeFallBody=session=>rules.players[classes.find(c=>c.name===resolveClassName(session.game.gameClass?.stats?.name))?.l2Id]||null;
export function nativeFallDamage(session,height,now){
 const body=nativeFallBody(session);if(!rules.enabled||!body||!Number.isFinite(height)||height<=body.safeHeight)return 0;
 const base=height*getMaxHp(session)/rules.damageDivisor;
 return Math.max(0,Math.trunc(base*nativePassiveStat(session,'fall',true)*l2RawStat(session,'fall',true,now)+nativePassiveStat(session,'fall',false)+l2RawStat(session,'fall',false,now)));
}
export function scheduleNativeFallDamage(session,height,now){
 advanceNativeFallDamage(session,now);const world=session.game.world,body=nativeFallBody(session);if(!body||height<=body.safeHeight||!rules.enabled)return;
 if(world.fallDamage?.validationUntil>now)return;
 if(!world.fallDamage)world.fallDamage={amount:nativeFallDamage(session,height,now),at:now+rules.damageDelayMs,validationUntil:now+rules.validationDelayMs};
 else Object.assign(world.fallDamage,{amount:world.fallDamage.amount||nativeFallDamage(session,height,now),at:now+rules.damageDelayMs,validationUntil:now+rules.validationDelayMs});
 session.needsSave=true;
}
export function advanceNativeFallDamage(session,now){
 const pending=session.game.world?.fallDamage;if(!pending||now<pending.at)return;
 delete session.game.world.fallDamage;
 const stats=session.game.gameClass?.stats;if(!stats||stats.hp<=0||l2HasControl(session,'Invincible',pending.at))return;
 const damage=Math.min(Math.max(0,stats.hp-1),pending.amount);stats.hp-=damage;
 session.game.world.lastFall={at:pending.at,damage};session.needsSave=true;
}
