import {classEffectSkills,applyL2Effect,l2ActionBlock,l2HasControl,l2RawStat,l2EffectRows,l2OnDamageReceived,l2OnHostileAction,isL2PetSkill,l2CompanionDamage} from '../functions/game/player/l2Effects.js';
import {fieldIsPresent,fieldPvpStatus,ensureFieldPvp,PVP_FLAG_MS} from '../functions/game/hunt/fieldPvpState.js';
import {partyTargets} from '../functions/game/party/party.js';
import {provokeMob} from '../functions/game/hunt/huntAi.js';
import {takeDamage} from '../functions/game/hunt/fieldPvp.js';
import {advanceHunt} from '../functions/game/hunt/huntFight.js';
import {canBuffOthers} from '../template/classBuffs.js';
import getCurrentHp from '../functions/game/player/getters/getCurrentHp.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import getCurrentMp from '../functions/game/player/getters/getCurrentMp.js';
import getMaxMp from '../functions/game/player/getters/getMaxMp.js';
import getAttack from '../functions/game/player/getters/getAttack.js';
import getDefence from '../functions/game/player/getters/getDefence.js';
import {memberName} from './social.js';
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const mpCost=(session,skill,now)=>Math.ceil(skill.mp*l2RawStat(session,n(skill.fields.isMagic)===1?'magicalMpConsumeRate':'physicalMpConsumeRate',true,now));
const p=e=>Object.fromEntries((e.children||[]).filter(c=>c.value!==undefined).map(c=>[c.tag,c.value]));
const statLabels={pAtk:'Ф. атака',mAtk:'М. атака',pDef:'Ф. защита',mDef:'М. защита',pAtkSpd:'Скорость атаки',mAtkSpd:'Скорость магии',maxHp:'Макс. HP',maxMp:'Макс. MP',maxCp:'Макс. CP',critRate:'Шанс крита',critDmg:'Сила крита',mCritRate:'Магический крит',mCritPower:'Сила маг. крита',accCombat:'Точность',rEvas:'Уклонение',runSpd:'Скорость',regHp:'Регенерация HP',regMp:'Регенерация MP',healEffect:'Исцеление',absorbDam:'Вампиризм',reflectDam:'Отражение',debuffVuln:'Уязвимость к дебаффам',magicalMpConsumeRate:'Расход MP магии',physicalMpConsumeRate:'Расход MP навыков'};
export function describeL2Effect(skill){
 if(isL2PetSkill(skill))return `Питомец помогает атакам: +${Math.round(Math.min(.6,.2+.02*(skill.level-1))*100)}% урона. Призыв за ману.`;
 const parts=[];
 for(const effect of skill.effects){
  for(const node of effect.children||[])if(node.stat&&node.value!==undefined){
   const value=n(node.value),amount=node.tag==='mul'?(value-1)*100:node.tag==='sub'?-value:value;
   parts.push(`${statLabels[node.stat]||node.stat} ${amount>=0?'+':''}${Math.round(amount*100)/100}${node.tag==='mul'?'%':''}`);
  }
  if(!['Buff','Debuff','Passive'].includes(effect.name))parts.push(({Stun:'Оглушение',Sleep:'Сон',Root:'Удержание',Fear:'Страх',Mute:'Запрет магии',PhysicalMute:'Запрет физических навыков',Paralyze:'Паралич',Disarm:'Разоружение',Invincible:'Неуязвимость',DamOverTime:'Периодический урон',ManaDamOverTime:'Периодическое сжигание MP',HealOverTime:'Периодическое лечение',DispelByCategory:'Снятие эффектов',DispelBySlot:'Снятие группы эффектов',Hide:'Скрытность',SilentMove:'Тихое передвижение',ImmobilePetBuff:'Защита питомца',ServitorShare:'Общая сила',Betray:'Предательство',Distrust:'Смятение'})[effect.name]||effect.name);
  if(effect.name==='ServitorShare')for(const node of effect.children||[])if(statLabels[node.tag])parts.push(`${statLabels[node.tag]} +${Math.round((n(node.value,1)-1)*100)}%`);
 }
 return parts.join(' · ')||skill.name;
}
export function getL2BuffsState(session,now=Date.now()){
 return classEffectSkills(session).map(skill=>({id:'l2:'+skill.id,name:skill.name,kind:skill.kind,group:skill.group,level:skill.learnedLevel,maxLevel:skill.maxLearnedLevel,firstLevelAt:skill.needLevel,nextLevelAt:skill.nextLevel,effect:describeL2Effect(skill),seconds:skill.seconds,toggle:skill.operate==='T',cost:mpCost(session,skill,now),costOthers:mpCost(session,skill,now),cooldownUntil:n(session.game.l2CastAt?.[skill.id]),active:l2EffectRows(session,now).find(row=>row.id==='l2:'+skill.id)||null}));
}
function instantEffects(caster,target,skill,now,random=Math.random){
 let damage=0,healed=0;
 const stats=target.game?.gameClass?.stats;
 const maxHp=stats?getMaxHp(target):target.hp,maxMp=stats?getMaxMp(target):n(target.maxMp);
 for(const effect of skill.effects){const params=p(effect),power=n(params.power,n(skill.fields.power));
  if(['Heal','HealPercent','CpHeal','CpHealPercent','ManaHealPercent','ConsumeBody'].includes(effect.name)){
   if(!stats)continue;
   const resource=effect.name.startsWith('Cp')?'cp':effect.name.startsWith('Mana')?'mp':'hp';
   const max=resource==='mp'?maxMp:resource==='cp'?n(stats.maxCp):maxHp;
   const amount=(effect.name.endsWith('Percent')?max*power/100:power)*l2RawStat(target,'healEffect',true,now);
   const before=n(stats[resource]);stats[resource]=Math.min(max,before+amount);healed+=stats[resource]-before;
  }
  if(['PhysicalDamage','MagicalDamage','PhysicalSoulDamage','MagicalSoulDamage','EnergyDamage','FatalBlow','HpDrain','MagicalDamageMp','PhysicalDamageMute'].includes(effect.name)){
   if(l2HasControl(target,'Invincible',now))continue;
   const defence=stats?getDefence(target):n(target.hunt?.defence,100);
   const factor=Math.max(.1,Math.min(6,1+power/1000));
   const base=Math.ceil(70*getAttack(caster)/Math.max(1,defence)*factor);
   const amount=base+l2CompanionDamage(caster,base,now);
   const before=stats?n(stats.hp):n(target.currentHp);const lost=Math.min(before,amount);
   if(stats){const chat=typeof caster.ownerDocument==='function'?caster.ownerDocument():null;if(chat)takeDamage(chat,caster,target,amount,now);}
   else {target.currentHp=before-lost;target.listOfDamage||=[];const credit=target.listOfDamage.find(r=>String(r.id)===String(caster.userId));if(credit)credit.damage+=lost;else target.listOfDamage.push({id:caster.userId,damage:lost});l2OnDamageReceived(target,caster,lost,now,random);}
   damage+=lost;
   if(effect.name==='HpDrain'){const casterStats=caster.game.gameClass.stats;casterStats.hp=Math.min(getMaxHp(caster),casterStats.hp+lost*n(params.absorb,20)/100);}
  }
  if(effect.name==='CpDamPercent'&&stats)stats.cp=Math.max(0,n(stats.cp)*(1-power/100));
  if(effect.name==='TargetMe'||effect.name==='GetAgro')target.aggro=true;
  if(effect.name==='TargetCancel')target.charging=null;
  if(effect.name==='Bluff'&&random()*100<n(params.chance)){target.charging=null;target.facingAwayUntil=now+skill.seconds*1000;}
  if(effect.name==='DeleteHateOfMe'){target.aggro=false;target.charging=null;}
  if(effect.name==='MagicalDamageMp'&&stats)stats.mp=Math.max(0,n(stats.mp)-power);
  if(effect.name==='Lethal'&&random()*100<n(params.halfLethal)){if(stats)stats.cp=0;else if(!target.raid)target.currentHp=Math.max(1,n(target.currentHp)/2);}
 }
 return {damage,healed};
}
export function castL2Buff(session,rawId,targetId=null,{now=Date.now(),random=Math.random,force=false}={}){
 const id=Number(String(rawId).replace(/^l2:/,''));
 const entry=classEffectSkills(session,{includeLocked:false}).find(s=>s.id===id);
 if(!entry)return {ok:false,reason:'not_learned'};
 const summon=isL2PetSkill(entry);
 if(entry.effects.some(e=>e.name==='Transformation'))return {ok:false,reason:'requires_transformation'};
 if(entry.effects.some(e=>e.name==='ConsumeBody'))return {ok:false,reason:'requires_corpse'};
 if(entry.operate==='T'&&l2EffectRows(session,now).some(e=>e.id==='l2:'+id))return {...applyL2Effect(session,session,id,entry.level,{now,random}),buff:'l2:'+id,onSelf:true,spent:0};
 if(getCurrentHp(session)<=0||session.game.respawnTime>now)return {ok:false,reason:'player_dead'};
 const block=l2ActionBlock(session,{magic:n(entry.fields.isMagic)===1,attack:entry.kind==='debuff'&&n(entry.fields.isMagic)!==1},now);if(block)return {ok:false,reason:block};
 if(n(session.game.l2CastAt?.[id])>now)return {ok:false,reason:'cooldown'};
 const hostile=entry.kind==='debuff';const chat=typeof session.ownerDocument==='function'?session.ownerDocument():null;
 let target=session;
 if(summon)targetId=null;
 if(hostile&&(targetId==null||targetId===''||targetId==='mob')){
  target=session.game.hunt?.mob;
  if(!target||target.currentHp<=0)return {ok:false,reason:'no_target'};
  if(session.game.hunt.field){const distance=Math.hypot(session.game.hunt.field.x-target.x,session.game.hunt.field.y-target.y);if(distance>.65)return {ok:false,reason:'pvp_out_of_range'};}
 }else if(targetId!=null&&String(targetId)!==String(session.userId)&&targetId!==''){
  target=chat?.members?.find(m=>String(m.userId)===String(targetId)&&!m.isHided&&!m.userChatData?.user?.is_bot);
  if(!target)return {ok:false,reason:'unknown_player'};
  if(!hostile&&!canBuffOthers(session.game.gameClass.stats.name))return {ok:false,reason:'self_only'};
  if(hostile){
   if(!fieldIsPresent(session,now)||!fieldIsPresent(target,now)||session.game.hunt.zone!==target.game.hunt.zone)return {ok:false,reason:'pvp_not_here'};
   if(Math.hypot(session.game.hunt.field.x-target.game.hunt.field.x,session.game.hunt.field.y-target.game.hunt.field.y)>.65)return {ok:false,reason:'pvp_out_of_range'};
   if(fieldPvpStatus(target,now).status==='neutral'&&!force)return {ok:false,reason:'pvp_force_required'};
  }
 }else if(hostile)return {ok:false,reason:'invalid_target'};
 if(entry.fields.targetType==='SELF'&&target!==session)return {ok:false,reason:'self_only'};
 if(target.game&&getCurrentHp(target)<=0)return {ok:false,reason:'player_dead'};
 const cost=mpCost(session,entry,now);
 const hpCost=summon?0:n(entry.fields.hpConsume);
 if(getCurrentMp(session)<cost)return {ok:false,reason:'not_enough_mp'};
 if(getCurrentHp(session)<=hpCost)return {ok:false,reason:'not_enough_hp'};
 // Weapon/HP and special prerequisites are enforced from the original conditions.
 const conditionNodes=entry.conditions.flatMap(c=>c.children||[]);
 const walk=nodes=>nodes.flatMap(e=>[e,...walk(e.children||[])]);
 const weapons=Object.values(session.game.equipmentStats||{}).filter(item=>item?.mainType==='weapon');
 for(const node of summon?[]:walk(conditionNodes)){
  if(node.tag==='player'&&node.hp&&getCurrentHp(session)/getMaxHp(session)*100>n(node.hp,100))return {ok:false,reason:'effect_condition'};
  if(node.tag==='player'&&node.hero==='true'&&!session.game.isHero)return {ok:false,reason:'effect_condition'};
  if(node.tag==='player'&&node.noble==='true'&&!session.game.isNoble)return {ok:false,reason:'effect_condition'};
  if(node.tag==='using'&&node.kind&&!weapons.some(w=>node.kind.split(',').some(kind=>String(w.kind||'').toUpperCase().includes(kind))))return {ok:false,reason:'effect_condition'};
 }
 const party=entry.fields.targetType==='PARTY'&&chat?partyTargets(chat,session):[];
 const audience=(!hostile&&party.length?party:[target]).filter(member=>!member.game||getCurrentHp(member)>0);
 session.game.gameClass.stats.mp=getCurrentMp(session)-cost;session.game.gameClass.stats.hp=getCurrentHp(session)-hpCost;
 if(hostile)l2OnHostileAction(session,now);
 session.game.l2CastAt||={};session.game.l2CastAt[id]=now+entry.reuseMs*l2RawStat(session,n(entry.fields.isMagic)===1?'mReuse':'pReuse',true,now);
 const results=audience.map(member=>{
  const result=applyL2Effect(session,member,id,entry.level,{now,random});
  if(result.applied||entry.operate==='A1'||entry.effects.some(e=>/Damage|Drain|FatalBlow/.test(e.name)))Object.assign(result,instantEffects(session,member,entry,now,random));
  if(member!==session&&member.game)member.needsSave=true;
  return result;
 });
 if(hostile&&target.game){if(fieldPvpStatus(target,now).status!=='pk')ensureFieldPvp(session).flagUntil=now+PVP_FLAG_MS;}
 if(hostile&&!target.game&&session.game.hunt.field)provokeMob(session.game.hunt,target,now);
 if(hostile&&!target.game)session.game.hunt.lastActionAt=now;
 if(hostile&&!target.game)advanceHunt(session,now,random);
 return {ok:true,buff:'l2:'+id,level:entry.level,summoned:summon,onSelf:target===session,targetName:target.game?memberName(target):target.name,until:results[0]?.until,spent:cost,resisted:results.every(r=>r.resisted),toggledOff:results[0]?.toggledOff,removed:results.reduce((sum,r)=>sum+n(r.removed),0),results,changed:true};
}
