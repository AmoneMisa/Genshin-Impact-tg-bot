import {saDefinition,saBonuses} from './soulCrystals.js';
import {uniqueEquipped} from './itemBonuses.js';
import {aliveRequiredUnits} from '../boss/bossUnits.js';
import {isMagicClass} from '../classes/classFamily.js';
import {applyBossDebuff} from '../boss/bossDebuffs.js';

export const wornSoulWeapon=session=>uniqueEquipped(session?.game?.equipmentStats||{}).find(i=>i.mainType==='weapon'&&saDefinition(i));
// Crit-specialized attacks represent flank attacks in the game's stationary combat.
export function soulBackCritical(session,skill){return skill?.backAttack||skill?.critChanceBonus>0?saBonuses(wornSoulWeapon(session)).backCriticalMul||1:1;}
export function soulBuffStat(session,name,isMul,now=session.soulNow??Date.now()){
 return (session.game.saBuffs||[]).filter(b=>b.until>now).reduce((v,b)=>isMul?v*(b.values[name]??1):v+(b.values[name]??0),isMul?1:0);
}
export function applySoulSpell(session,skill,now=Date.now(),random=Math.random){
 const item=wornSoulWeapon(session),o=saDefinition(item);if(!['magic-focus','blessed-body'].includes(o?.id)||!isMagicClass(session.game.gameClass?.stats?.name))return;
 const chance=Number(o.description.match(/(\d+)%/)?.[1]||20);if(random()*100>=chance)return;
 const proc=o.procs[0];if(!proc)return;const values=saBonuses(item,{effects:proc.stats});
 session.game.saBuffs=(session.game.saBuffs||[]).filter(b=>b.until>now&&b.id!==o.id).concat({id:o.id,values,until:now+proc.seconds*1000});
}
export function soulShotCost(session,base,random=Math.random){
 const item=wornSoulWeapon(session),o=saDefinition(item);if(o?.id!=='miser')return base;
 const chance=Number(o.description.match(/(\d+)%/)?.[1]||0)/100;
 // Native shot counts use a different weapon cost scale; keep their reduction proportion.
 return random()<chance?Math.max(1,Math.ceil(base*.7)):base;
}
export function soulSkillCost(session,skill,cost,random=Math.random){
 const item=wornSoulWeapon(session),o=saDefinition(item);if(o?.id!=='cheap-shot'||!skill?.isDealDamage)return cost;
 if(o.effects.length)return cost;
 // Deterministic effective cost keeps availability checks, the HUD and payment identical.
 const chance=Number(o.description.match(/(\d+)%/)?.[1]||0)/100;
 return cost>0?Math.max(1,Math.floor(cost*(1-chance*.5))):0;
}

/** High Five proc triggers, with DoT damage scaled to the game's weapon power. */
export function applySoulHit(session,target,{critical=false,dealt=0,now=Date.now(),random=Math.random}={}){
 const item=wornSoulWeapon(session),o=saDefinition(item);if(!o||dealt<=0)return {drain:0,effects:[]};
 const magic=isMagicClass(session.game.gameClass?.stats?.name),effects=[];let drain=saBonuses(item).vampirism||0;
 for(const proc of o.procs||[]){
  if(o.label.startsWith('Critical')&&!critical||o.label.startsWith('Magic')&&!magic||o.label==='Blessed Body'||o.label==='Magic Focus')continue;
  if(random()*100>=proc.chance)continue;
  if(proc.effects.includes('HpDrain'))drain+=proc.drain;
  else if(proc.effects.includes('Stun'))effects.push(applyBossDebuff(target,{kind:'stun',seconds:proc.seconds},now));
  else if(proc.effects.includes('DamOverTime')&&target.currentHp>0){
   const kind=o.label.toLowerCase().includes('poison')?'poison':'bleed';
   const dot={kind,userId:session.userId||session.userChatData?.user?.id,damage:Math.max(1,Math.round(dealt*.05)),nextAt:now+3000,until:now+proc.seconds*1000};
   target.soulDots=(target.soulDots||[]).filter(d=>d.kind!==kind||d.userId!==dot.userId).concat(dot);target.markModified?.('soulDots');effects.push({kind,applied:true});
  }else if(o.label==='Magic Weakness')effects.push(applyBossDebuff(target,{kind:'weaken',amount:15,seconds:proc.seconds},now));
  else if(o.label==='Critical Slow')effects.push(applyBossDebuff(target,{kind:'slow',amount:30,seconds:proc.seconds},now));
  else if(o.label==='Magic Chaos')effects.push(applyBossDebuff(target,{kind:'accuracyDown',amount:15,seconds:proc.seconds},now));
  else if(proc.effects.includes('Mute'))effects.push(applyBossDebuff(target,{kind:'mute',amount:100,seconds:proc.seconds},now));
 }
 return {drain:Math.min(.5,drain),effects:effects.filter(Boolean)};
}

export function tickSoulDots(target,now=Date.now()){
 const floor=aliveRequiredUnits(target).length?1:0;
 let total=0;for(const dot of target?.soulDots||[]){let ticks=0;while(dot.nextAt<=now&&dot.nextAt<=dot.until&&target.currentHp>floor&&ticks++<12){dot.nextAt+=3000;const damage=Math.min(dot.damage,target.currentHp-floor);target.currentHp-=damage;total+=damage;const credit=(target.listOfDamage||[]).find(p=>p.id===dot.userId);if(credit)credit.damage+=damage;else (target.listOfDamage||=[]).push({id:dot.userId,damage});}}
 if(target)target.soulDots=(target.soulDots||[]).filter(d=>d.nextAt<=d.until);if(total){target.markModified?.('soulDots');target.markModified?.('listOfDamage');}return total;
}
