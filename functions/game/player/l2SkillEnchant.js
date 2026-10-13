import DATA from '../../../template/l2SkillEnchantData.js';
import L2 from '../../../template/l2Classes.js';
import classes from '../../../template/classStatsTemplate.js';
import {getMaterialCount,spendMaterials} from './materials.js';
import {l2SkillAt} from './skillLevel.js';

export const ENCHANT_BOOKS={normal:6622,mastery:9627,change:9626,untrain:9625};
export function classSkillRows(session){
 const game=session.game, lvl=Number(game.stats?.lvl)||1;
 let id=classes.find(c=>c.name===game.gameClass?.stats?.name)?.l2Id;
 const rows=new Map(), seen=new Set();
 while(id!=null&&!seen.has(id)){
  seen.add(id);
  for(const [skillId,level,need] of L2.learn[id]||[]){
   if(need>lvl)continue;
   const old=rows.get(skillId);if(!old||old.level<level)rows.set(skillId,{id:skillId,level,need});
  }
  id=L2.classes[id]?.parent;
 }
 for(const skill of game.gameClass?.skills||[]){
  if(!skill.l2Id||skill.needLvl>lvl)continue;
  const at=l2SkillAt(skill.l2Id,lvl);
  if(at)rows.set(Number(skill.l2Id),{id:Number(skill.l2Id),level:skill.tier&&!game.learnedSkills?.[skill.l2Id]?0:at.level,need:skill.needLvl||1,slot:skill.slot,description:skill.description});
 }
 return [...rows.values()].map(row=>({...row,...L2.skills[row.id],id:row.id,availableLevel:row.level,level:L2.skills[row.id]?.op==='P'?Number(game.l2Passives?.[row.id]||0):row.level}));
}
export function enchantRecord(session,id){return session.game.skillEnchants?.[id]||{route:0,level:0};}
export function enchantFields(id,route,level){
 const s=DATA.skills[id];if(!s)return null;
 const step=s.routes[route]?.steps[Math.max(0,level-1)];
 return step&&level>0?{...s.base,...step.fields}:s.base;
}
export function enchantedEffects(id,route,level){return DATA.skills[id]?.routes[route]?.steps[level-1]?.effects||[];}
export function enchantFactors(skill){
 const s=DATA.skills[skill?.l2Id],fields=enchantFields(skill?.l2Id,skill?.l2EnchantRoute,skill?.enchantLevel);
 const ratio=name=>s&&Number(s.base[name])>0&&Number.isFinite(Number(fields?.[name]))?Number(fields[name])/Number(s.base[name]):1;
 return {power:ratio('power'),cost:((Number(fields?.mpConsume)||0)+(Number(fields?.mpInitialConsume)||0))/((Number(s?.base.mpConsume)||0)+(Number(s?.base.mpInitialConsume)||0))||1,cooldown:ratio('reuseDelay')};
}
const labels={power:'Сила',mpConsume:'Стоимость',mpInitialConsume:'Стоимость',reuseDelay:'Перезарядка',abnormalTime:'Время',activateRate:'Шанс',elementPower:'Атрибут'};
function routeName(route){
 const fields=route.steps[0]?.fields||{};
 const key=Object.keys(fields).find(k=>k!=='magicLevel'&&labels[k]);
 if(key)return labels[key];
 const stat=route.steps[0]?.effects.flatMap(e=>e.stats).find(s=>s.stat);
 return stat?.stat?({firePower:'Ослабление огня',waterPower:'Ослабление воды',windPower:'Ослабление ветра',pDef:'Защита',mDef:'Магическая защита'}[stat.stat]||stat.stat):'Эффект';
}
export function enchantOffer(session,id,{mode='normal',route}={}){
 const info=DATA.skills[id],owned=classSkillRows(session).find(s=>s.id===Number(id));
 if(!info||!owned)return {ok:false,reason:'not_enchantable'};
 if((session.game.stats?.lvl||1)<76||(session.game.gameClass?.stats?.tier||1)<4)return {ok:false,reason:'enchant_class_required'};
 if(owned.level<info.baseLevel)return {ok:false,reason:'skill_not_maxed'};
 if(!(mode in ENCHANT_BOOKS))return {ok:false,reason:'invalid_mode'};
 const record=enchantRecord(session,id),selected=Number(route||record.route||Object.keys(info.routes)[0]);
 if(!info.routes[selected])return {ok:false,reason:'unknown_route'};
 if(['change','untrain'].includes(mode)&&!record.level)return {ok:false,reason:'no_route'};
 if(mode==='change'&&selected===record.route)return {ok:false,reason:'same_route'};
 if(['normal','mastery','untrain'].includes(mode)&&record.level&&selected!==record.route)return {ok:false,reason:'other_route_chosen'};
 const target=['change','untrain'].includes(mode)?record.level:record.level+1;
 const step=DATA.groups[info.routes[selected].group][target-1];
 if(!step)return {ok:false,reason:'max_level'};
 const book=mode==='normal'&&target>1?null:ENCHANT_BOOKS[mode];
 const multiplier=mode==='mastery'?5:1;
 const cost={gold:step.adena*multiplier,sp:mode==='untrain'?0:step.sp*multiplier,items:book?{['l2_'+book]:1}:{}};
 const chance=mode==='change'||mode==='untrain'?1:step['chance'+Math.min(85,Math.max(76,session.game.stats.lvl))]/100;
 const wallet=session.game.inventory;
 const affordable=(wallet.gold||0)>=cost.gold&&(wallet.sp||0)>=cost.sp&&(!book||getMaterialCount(session,'l2_'+book)>=1);
 return {ok:true,id:Number(id),mode,route:selected,level:record.level,target,maxLevel:info.routes[selected].steps.length,cost,chance,affordable,refundSp:mode==='untrain'?Math.floor(step.sp*.8):0,before:enchantFields(id,record.route,record.level),after:enchantFields(id,selected,mode==='untrain'?record.level-1:target)};
}
export function enchantL2Skill(session,id,options={}){
 const offer=enchantOffer(session,id,options);if(!offer.ok)return offer;
 if(session.game.gameClass.stats.hp<=0)return {ok:false,reason:'player_dead'};
 if(!offer.affordable)return {ok:false,reason:'not_enough_resources'};
 const random=options.random||Math.random, success=random()<offer.chance,previous=enchantRecord(session,id);
 let level=success?offer.target:offer.mode==='mastery'?previous.level:0;
 if(offer.mode==='change')level=Math.max(0,previous.level-Math.floor(random()*Math.min(4,previous.level)));
 if(offer.mode==='untrain')level=previous.level-1;
 spendMaterials(session,offer.cost.items);
 const wallet=session.game.inventory;wallet.gold-=offer.cost.gold;wallet.sp=(wallet.sp||0)-offer.cost.sp+offer.refundSp;
 session.game.skillEnchants||={};session.game.skillEnchants[id]={route:level?offer.route:0,level};
 syncKitEnchants(session);session.needsSave=true;
 return {ok:true,success,level,route:level?offer.route:0,mode:offer.mode,chance:offer.chance,cost:offer.cost,refundSp:offer.refundSp};
}
export function syncKitEnchants(session){for(const skill of session.game.gameClass?.skills||[]){if(!skill.l2Id)continue;const rec=enchantRecord(session,skill.l2Id);skill.enchantLevel=rec.level;skill.l2EnchantRoute=rec.route;delete skill.routeKind;delete skill.routeLevel;}}
export function skillEnchantBook(session){return classSkillRows(session).filter(s=>DATA.skills[s.id]).map(skill=>{
 const info=DATA.skills[skill.id],record=enchantRecord(session,skill.id);
 return {id:skill.id,name:skill.name,...record,baseLevel:info.baseLevel,routes:Object.entries(info.routes).map(([route,r])=>({id:Number(route),name:routeName(r),max:r.steps.length,offers:Object.fromEntries(Object.keys(ENCHANT_BOOKS).map(mode=>[mode,enchantOffer(session,skill.id,{mode,route:Number(route)})]))})),offer:enchantOffer(session,skill.id)};
});}
