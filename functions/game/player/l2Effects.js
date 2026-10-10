// High Five abnormal effects. Stored records contain IDs/levels/time only; values come from trusted XML.
import {L2_EFFECT_SKILLS,L2_EFFECT_LEARN,L2_CLASSES} from '../../../template/l2EffectSkills.js';
import {isMagicClass} from '../classes/classFamily.js';
export const L2_EFFECT_LIMITS=Object.freeze({buff:24,debuff:16,music:12});
export const PROJECT_L2_CLASSES=Object.freeze({noClass:0,warrior:0,crusader:5,phoenixKnight:90,warden:6,bastion:91,mage:10,elementalist:12,archmage:94,warlock:13,soulReaper:95,priest:15,cleric:17,saint:98,inquisitor:16,judicator:97,archer:7,ranger:9,hawkeye:92,sniper:24,phantomShot:102,rogue:7,assassin:8,shadowBlade:93,trickster:34,phantomDancer:107,berserk:1,slayer:2,warbringer:88,ironclad:3,titan:89});
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function effectValue(skill,value,level=1){
 if(typeof value!=='string')return value;
 if(value.startsWith('#')){const table=skill.tables[value];return table?.[clamp(level-1,0,table.length-1)]??null;}
 return value;
}
const resolveNode=(skill,node,level)=>({...node,...(node.value!==undefined?{value:effectValue(skill,node.value,level)}:{}),...(node.children?{children:node.children.map(c=>resolveNode(skill,c,level))}:{})});
export function resolveEffectSkill(id,level=1){
 const source=L2_EFFECT_SKILLS[Number(String(id).replace(/^l2:/,''))];if(!source)return null;
 const actual=clamp(Math.floor(n(level,1)),1,source.levels);
 const fields=Object.fromEntries(Object.entries(source.fields).map(([key,value])=>[key,effectValue(source,value,actual)]));
 const effects=source.effects.map(e=>resolveNode(source,e,actual));
 const hostile=fields.isDebuff==='true'||(!['SELF','PARTY','PET','SUMMON'].includes(fields.targetType)&&(n(fields.effectPoint)<0||effects.some(e=>/^(Physical|Magical|Energy).*Damage|^FatalBlow$|^HpDrain$|^CpDamPercent$|^GetAgro$|^TargetMe/.test(e.name))));
 return {...source,kind:hostile?'debuff':'buff',level:actual,fields,effects,seconds:n(fields.abnormalTime,source.operate==='T'?3600:20),strength:n(fields.abnormalLevel,actual),mp:n(fields.mpConsume)+n(fields.mpInitialConsume),reuseMs:Math.max(1000,n(fields.reuseDelay,2000))};
}
export function classEffectSkills(session,{includeLocked=true}={}){
 const name=session?.game?.gameClass?.stats?.name||'noClass';
 const classes=new Set();let current=String(PROJECT_L2_CLASSES[name]??0);
 while(current&&!classes.has(current)){classes.add(current);current=L2_CLASSES[current]?.parent;}
 // Our support line covers the L2 buffer professions; the dancer retains its original song/dance tree.
 if(['cleric','saint'].includes(name))for(const id of [17,30,43,51,52,98,104,105,115,116,21,34,100,107])classes.add(String(id));
 const byId=new Map();const playerLevel=n(session?.game?.stats?.lvl,1);
 for(const classId of classes)for(const row of L2_EFFECT_LEARN[classId]||[]){
  const skill=L2_EFFECT_SKILLS[row.id];if(!skill||skill.operate==='P')continue;
  let list=byId.get(row.id);if(!list)byId.set(row.id,list=[]);list.push(row);
 }
 return [...byId].map(([id,rows])=>{
  rows.sort((a,b)=>a.needLevel-b.needLevel||a.level-b.level);
  const eligible=rows.filter(r=>r.needLevel<=playerLevel);
  const learned=eligible.sort((a,b)=>b.level-a.level)[0];
  const next=rows.filter(r=>r.needLevel>playerLevel).sort((a,b)=>a.needLevel-b.needLevel)[0];
  const skill=resolveEffectSkill(id,learned?.level||rows[0].level);
  return {...skill,learnedLevel:learned?.level||0,needLevel:rows[0].needLevel,nextLevel:next?.needLevel||null,maxLearnedLevel:Math.max(...rows.map(r=>r.level))};
 }).filter(s=>includeLocked||s.learnedLevel>0).sort((a,b)=>a.kind.localeCompare(b.kind)||a.name.localeCompare(b.name));
}
const records=target=>{const list=target?.game?target.game.effects:target?.l2Effects;return Array.isArray(list)?list:[];};
const assign=(target,list)=>{if(target.game)target.game.effects=list;else target.l2Effects=list;};
export function activeL2Effects(target,now=Date.now()){
 return records(target).filter(e=>e?.l2SkillId&&n(e.until)>now).map(e=>({record:e,skill:resolveEffectSkill(e.l2SkillId,e.level)})).filter(e=>e.skill);
}
const params=e=>Object.fromEntries((e.children||[]).filter(c=>c.value!==undefined).map(c=>[c.tag,c.value]));
function statNodeValue(target,node){
 if(node.value!==undefined)return node.value;
 const conditions=(node.children||[]).filter(c=>c.tag!=='value');
 const weapon=Object.values(target.game?.equipmentStats||{}).find(i=>i?.mainType==='weapon');
 const matches=c=>c.tag==='and'?(c.children||[]).every(matches):c.tag==='or'?(c.children||[]).some(matches):c.tag==='player'?(!c.hp||n(target.game?.gameClass?.stats.hp)/Math.max(1,n(target.game?.gameClass?.stats.maxHp))*100<=n(c.hp)) :c.tag==='using'?(!c.kind||c.kind.split(',').some(kind=>String(weapon?.kind||'').toUpperCase().includes(kind)))&&(!c.slot||c.slot!=='lrhand'||weapon?.slots?.length===2):false;
 return conditions.every(matches)?node.children?.find(c=>c.tag==='value')?.value:null;
}
export function l2HasControl(target,control,now=Date.now()){
 return activeL2Effects(target,now).some(({skill})=>skill.effects.some(e=>e.name===control));
}
export function l2ActionBlock(target,{magic=false,move=false,attack=false}={},now=Date.now()){
 for(const control of ['Stun','Sleep','Paralyze','Petrification','Fear','FakeDeath'])if(l2HasControl(target,control,now))return 'effect_'+control.toLowerCase();
 if(move&&(l2HasControl(target,'Root',now)||l2HasControl(target,'ImmobileBuff',now)))return 'effect_root';
 if(!move&&magic&&l2HasControl(target,'Mute',now))return 'effect_silence';
 if(!move&&!magic&&l2HasControl(target,'PhysicalMute',now))return 'effect_physical_silence';
 if(attack&&l2HasControl(target,'Disarm',now))return 'effect_disarm';
 return null;
}
export function l2RawStat(target,stat,isMul=false,now=Date.now()){
 let total=isMul?1:0;
 for(const {skill} of activeL2Effects(target,now))for(const e of skill.effects){
  if(e.name==='MaxHp'&&stat==='maxHp'){
   const p=params(e);if(isMul&&p.type==='PER')total*=1+n(p.power)/100;else if(!isMul&&p.type!=='PER')total+=n(p.power);
  }
  for(const node of e.children||[]){
   if(node.stat!==stat)continue;
   const raw=statNodeValue(target,node);if(raw===null||raw===undefined)continue;
   const value=n(raw,isMul?1:0);
   if(isMul&&node.tag==='mul')total*=value;
   if(!isMul&&['add','sub'].includes(node.tag))total+=(node.tag==='sub'?-value:value);
  }
 }
 return total;
}
export function l2StatBonus(session,stat,isMul=false,now=Date.now()){
 const magic=isMagicClass(session?.game?.gameClass?.stats?.name);
 const mul={attackMul:magic?'mAtk':'pAtk',defenceMul:magic?'mDef':'pDef',maxHpMul:'maxHp',maxMpMul:'maxMp',maxCpMul:'maxCp',criticalChanceMul:magic?'mCritRate':'critRate',criticalDamage:magic?'mCritPower':'critDmg',attackSpeedMul:'pAtkSpd',castingSpeedMul:'mAtkSpd',healPowerMul:'healEffect',hpRegenMul:'regHp',mpRegenMul:'regMp',skillCooltimeMul:magic?'mReuse':'pReuse',skillMpCostMul:magic?'magicalMpConsumeRate':'physicalMpConsumeRate'};
 const flat={attack:magic?'mAtk':'pAtk',defence:magic?'mDef':'pDef',accuracy:'accCombat',evasion:'rEvas',speed:'runSpd',maxHp:'maxHp',maxMp:'maxMp',maxCp:'maxCp',criticalChance:magic?'mCritRate':'critRate'};
 if(isMul&&mul[stat])return clamp(l2RawStat(session,mul[stat],true,now),.05,10);
 if(!isMul&&flat[stat])return l2RawStat(session,flat[stat],false,now);
 return isMul?1:0;
}
export function l2Resistance(target,trait,now=Date.now()){
 trait=({ROOT:'HOLD',BLEEDING:'BLEED',SILENCE:'DERANGEMENT'}[trait]||trait);
 let value=0;
 for(const {skill} of activeL2Effects(target,now))for(const effect of skill.effects){
  if(effect.name==='DefenceTrait')value+=n(params(effect)[trait]);
 }
 return clamp(value-l2RawStat(target,'debuffVuln',false,now),-100,100);
}
export const LEGACY_L2_BUFFS=Object.freeze({might:1068,shield:1040,haste:1086,focus:1077,guidance:1240,'death-whisper':1242,'wind-walk':1204});
const legacyGroups=Object.fromEntries(Object.entries(LEGACY_L2_BUFFS).map(([key,id])=>[key,L2_EFFECT_SKILLS[id].fields.abnormalType]));
const category=s=>s.group==='Песни'||s.group==='Танцы'?'music':s.kind;
export function removeL2Effects(target,{kind=null,slot=null,max=Infinity,rate=100,maxLevel=Infinity}={},now=Date.now(),random=Math.random){
 let removed=0;
 assign(target,records(target).filter(e=>{
  const s=e.l2SkillId?resolveEffectSkill(e.l2SkillId,e.level):null;
  const eligible=s?s.strength<=maxLevel&&(kind===null||s.kind===kind)&&(!slot||s.fields.abnormalType===slot):e.potionId&&(kind===null||kind==='buff')&&(!slot||legacyGroups[e.potionId]===slot);
  if(eligible&&removed<max&&random()*100<rate){removed++;return false;}return true;
 }));
 const legacyKind={POISON:'poison',BLEEDING:'bleed',SILENCE:'mute',SPEED_DOWN:'slow',PA_DOWN:'weaken',PD_DOWN:'armorBreak'}[slot];
 if(kind==='debuff'||legacyKind){
  for(const list of [target.game?.hunt?.playerDebuffs,target.game?.worldPvp?.effects?.debuffs])if(Array.isArray(list))for(const effect of list){if(removed>=max)break;if((!legacyKind||effect.kind===legacyKind)&&random()*100<rate){effect.until=now;removed++;}}
  if((!slot||slot==='STUN')&&target.game?.worldPvp?.effects?.stunUntil>now&&removed<max){target.game.worldPvp.effects.stunUntil=now;removed++;}
 }
 return removed;
}
export function applyL2Effect(caster,target,id,level=1,{now=Date.now(),random=Math.random,guaranteed=false}={}){
 const skill=resolveEffectSkill(id,level);if(!skill||!target)return {ok:false,reason:'unknown_effect'};
 if(skill.kind==='debuff'&&!guaranteed){
  if(l2HasControl(target,'Invincible',now)||l2RawStat(target,'debuffImmunity',false,now)>0)return {ok:true,applied:false,resisted:true};
  const trait=skill.fields.trait||skill.fields.abnormalType;
  const resistance=l2Resistance(target,trait,now);
  const attackerLevel=n(caster?.game?.stats?.lvl,caster?.level||1),targetLevel=n(target?.game?.stats?.lvl,target?.level||1);
  const chance=clamp(n(skill.fields.activateRate,80)+(attackerLevel-targetLevel)*2-resistance,5,95);
  if(resistance>=100||random()*100>=chance)return {ok:true,applied:false,resisted:true};
 }
 const current=activeL2Effects(target,now);
 for(const {skill:active} of current)for(const e of active.effects)if(e.name==='BlockAbnormalSlot'&&String(params(e).slot||'').split(';').includes(skill.fields.abnormalType))return {ok:true,applied:false,kept:true,blocked:true};
 if(skill.operate==='T'&&current.some(e=>e.skill.id===skill.id)){assign(target,records(target).filter(e=>e.l2SkillId!==skill.id));return {ok:true,applied:false,toggledOff:true};}
 const group=skill.fields.abnormalType||'SKILL_'+skill.id;
 const existing=current.find(e=>(e.skill.fields.abnormalType||'SKILL_'+e.skill.id)===group);
 if(existing&&existing.skill.strength>skill.strength)return {ok:true,applied:false,kept:true,until:existing.record.until};
 let removed=0;
 for(const e of skill.effects){const p=params(e);
  if(e.name.startsWith('DispelBy')){
   if(p.dispel){for(const entry of String(p.dispel).split(';')){const [slot,level]=entry.split(',');removed+=removeL2Effects(target,{slot,maxLevel:level===undefined?Infinity:n(level),max:n(p.max,Infinity),rate:n(p.rate,100)},now,random);}}
   else removed+=removeL2Effects(target,{kind:String(p.slot||'debuff').toLowerCase()==='buff'?'buff':'debuff',max:n(p.max,Infinity),rate:n(p.rate,100)},now,random);
  }
 }
 const timed=['A2','A3','T','DA2'].includes(skill.operate)||Boolean(skill.fields.abnormalTime);
 if(!timed)return {ok:true,applied:removed>0,removed};
 const cat=category(skill);
 const list=records(target).filter(e=>!e.l2SkillId||n(e.until)>now).filter(e=>{
  if(e.potionId&&legacyGroups[e.potionId]===group)return false;
  const s=e.l2SkillId?resolveEffectSkill(e.l2SkillId,e.level):null;return !s||(s.fields.abnormalType||'SKILL_'+s.id)!==group;
 });
 const same=list.filter(e=>e.l2SkillId?category(resolveEffectSkill(e.l2SkillId,e.level))===cat:cat==='buff'&&e.potionId);
 if(same.length>=L2_EFFECT_LIMITS[cat]){const oldest=same.sort((a,b)=>n(a.startedAt)-n(b.startedAt))[0];list.splice(list.indexOf(oldest),1);}
 const record={name:skill.name,l2SkillId:skill.id,level:skill.level,startedAt:now,until:now+clamp(skill.seconds,1,86400)*1000,lastTickAt:now,sourceId:String(caster?.userId||''),isDebuff:skill.kind==='debuff',kind:skill.kind};
 list.push(record);assign(target,list);
 if(skill.effects.some(e=>['Stun','Sleep','Paralyze','Petrification','TargetCancel'].includes(e.name)))target.charging=null;
 return {ok:true,applied:true,until:record.until,removed};
}
export function tickL2Effects(target,now=Date.now(),limits={}){
 const player=Boolean(target.game),stats=player?target.game.gameClass?.stats:null;
 let hp=player?n(stats?.hp):n(target.currentHp),mp=player?n(stats?.mp):n(target.mp),cp=player?n(stats?.cp):n(target.cp);
 if(hp<=0)return {damage:0,changed:false};
 let damage=0,changed=false,killerId=null;
 for(const record of records(target)){
  if(hp<=0)break;
  if(!record.l2SkillId)continue;
  const skill=resolveEffectSkill(record.l2SkillId,record.level);if(!skill)continue;
  const until=Math.min(now,n(record.until));const ticks=Math.max(0,Math.floor((until-n(record.lastTickAt,record.startedAt))/3000));
  if(!ticks)continue;record.lastTickAt=n(record.lastTickAt,record.startedAt)+ticks*3000;
  for(const e of skill.effects){const p=params(e),amount=Math.max(0,n(p.power)*ticks);
   if(e.name==='DamOverTime'&&!l2HasControl(target,'Invincible',until)){const lost=Math.min(hp,amount);hp-=lost;damage+=lost;if(hp===0&&lost>0)killerId=record.sourceId;changed=true;}
   if(e.name==='ManaDamOverTime'){mp=Math.max(0,mp-amount);changed=true;}
   if(e.name==='HealOverTime'){hp=Math.min(n(limits.hp,stats?.maxHp||target.hp),hp+amount);changed=true;}
   if(e.name==='ManaHealOverTime'){mp=Math.min(n(limits.mp,stats?.maxMp||target.maxMp),mp+amount);changed=true;}
   if(e.name==='MpConsumePerLevel'||e.name==='FakeDeath'||e.name==='Relax'){mp=Math.max(0,mp-n(p.power,1)*ticks);changed=true;}
   if(e.name==='Relax'||e.name==='ChameleonRest'){hp=Math.min(n(limits.hp,stats?.maxHp||target.hp),hp+ticks*(l2RawStat(target,'regHp',false,now)+1));changed=true;}
  }
  if(skill.operate==='T'&&mp<=0)record.until=until;
 }
 if(player&&stats){stats.hp=hp;stats.mp=mp;stats.cp=cp;if(hp<=0&&!l2PreventDeath(target,now)){target.game.respawnTime=now+60000;if(killerId)target.game.l2PendingDeath={sourceId:killerId,at:now};}if(changed)target.needsSave=true;}
 else{target.currentHp=hp;target.mp=mp;}
 assign(target,records(target).filter(e=>!e.l2SkillId||n(e.until)>now));
 return {damage,changed,killerId};
}
export function l2EffectRows(target,now=Date.now()){
 return activeL2Effects(target,now).map(({record,skill})=>({id:'l2:'+skill.id,iconKey:'l2:'+skill.id,label:skill.name,name:skill.name,kind:skill.kind,until:record.until,level:record.level,count:Math.ceil((record.until-now)/1000)}));
}
export function l2OnDamageReceived(target,attacker,damage,now=Date.now(),random=Math.random){
 if(!(damage>0))return;
 const snapshot=activeL2Effects(target,now);
 for(const {record,skill} of snapshot){
  if(skill.effects.some(e=>e.name==='Sleep'||e.name==='Hide'))record.until=now;
  for(const e of skill.effects)if(e.name==='TriggerSkillByDamageReceived'){
   const p=params(e),level=n(attacker?.game?.stats?.lvl,attacker?.level||1);
   if(damage>=n(p.minDamage)&&level>=n(p.minAttackerLevel,1)&&level<=n(p.maxAttackerLevel,99)&&random()*100<n(p.chance))applyL2Effect(target,p.targetType==='SELF'?target:attacker,n(p.skillId),n(p.skillLevel,1),{now,random,guaranteed:true});
  }
 }
}
export function l2OnHostileAction(target,now=Date.now()){
 for(const {record,skill} of activeL2Effects(target,now))if(skill.effects.some(e=>e.name==='Hide'))record.until=now;
}
export function l2PreventDeath(target,now=Date.now()){
 const effect=activeL2Effects(target,now).find(({skill})=>skill.effects.some(e=>e.name==='ResurrectionSpecial'));
 if(!effect||!target.game?.gameClass?.stats)return false;
 const stats=target.game.gameClass.stats;stats.hp=Math.max(1,stats.maxHp);stats.mp=stats.maxMp;stats.cp=stats.maxCp;effect.record.until=now;target.game.respawnTime=0;delete target.game.l2PendingDeath;return true;
}
/** Running uses its own multiplier; it must not speed up physical or magical casts. */
export function l2MoveMultiplier(target,now=Date.now()){return clamp(l2RawStat(target,'runSpd',true,now),.05,3);}
export function l2TraitDamage(caster,target,now=Date.now()){
 const race=String(target?.race||target?.hunt?.race||'').toUpperCase();
 const trait=({INSECT:'BUG_WEAKNESS',BUG:'BUG_WEAKNESS',ANIMAL:'ANIMAL_WEAKNESS',PLANT:'PLANT_WEAKNESS',BEAST:'BEAST_WEAKNESS',DRAGON:'DRAGON_WEAKNESS',UNDEAD:'UNDEAD_WEAKNESS'})[race];
 let bonus=0;for(const {skill} of activeL2Effects(caster,now))for(const effect of skill.effects)if(effect.name==='AttackTrait')bonus+=n(params(effect)[trait]);
 return 1+bonus/100;
}
/** Transfer only to the living nearby caster, and never recurse through another transfer. */
export function l2TransferDamage(target,damage,now=Date.now()){
 const effect=activeL2Effects(target,now).find(({skill})=>skill.effects.some(e=>e.name==='TransferDamage'));
 const chat=typeof target.ownerDocument==='function'?target.ownerDocument():null;
 const source=effect&&chat?.members?.find(m=>String(m.userId)===effect.record.sourceId&&m!==target);
 if(!source||source.game?.gameClass?.stats?.hp<=0)return damage;
 const a=source.game.hunt?.field,b=target.game.hunt?.field;
 if(!a||!b||source.game.hunt.zone!==target.game.hunt.zone||Math.hypot(a.x-b.x,a.y-b.y)>.65)return damage;
 const lost=Math.min(Math.max(0,source.game.gameClass.stats.hp-1),Math.floor(damage*clamp(l2RawStat(target,'transDamToPlayer',false,now),0,100)/100));
 source.game.gameClass.stats.hp-=lost;source.needsSave=true;return damage-lost;
}
