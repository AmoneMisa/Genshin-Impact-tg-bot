import equipmentTemplate from '../../../template/equipmentTemplate.js';
import {SOUL_COLORS,SOUL_MAX_STAGE,soulCrystalKey,SEAL_RATES} from '../../../template/soulCrystalData.js';
import {ABSORPTION,SA_WEAPONS} from '../../../template/soulCrystalSource.js';
import SA_PRICES from '../../../template/saPrices.js';
import {getMaterialCount,spendMaterials,addMaterial} from '../player/materials.js';
import {isActuallyEquipped} from './snapshots.js';
import getMaxHp from '../player/getters/getMaxHp.js';
const n=v=>Math.max(0,Number(v)||0);
const valid=(color,stage)=>Object.hasOwn(SOUL_COLORS,color)&&Number.isInteger(stage)&&stage>=0&&stage<=SOUL_MAX_STAGE;
// Original raid weapons use the corresponding top High Five weapon's SA table.
const EPIC_SA_BASE={oneHandedSword:'Periel Sword',twoHandedSword:'Feather Eye Blade',dagger:'Skull Edge',mace:'Rising Star',blunt:'Devilish Maul',fists:'Octo Claw',bow:'Skull Carnium Bow',crossbow:'Dominion Crossbow'};
const baseName=item=>item?.epicWeapon?EPIC_SA_BASE[item.kind]:item?.name;
export function saOptions(item){return item?.mainType==='weapon'&&['C','B','A','S','S80','S84'].includes(item.grade)?SA_WEAPONS[baseName(item)]||[]:[];}
export function saDefinition(item){return item?.sa?saOptions(item).find(o=>o.id===item.sa.id&&o.color===item.sa.color&&o.stage===item.sa.stage)||null:null;}
// Real High Five prices (template/saPrices.js): install = Soul Crystal + Gemstones (+ adena up to B grade), removal = Ancient
// Adena. High Five has no removal service for S grade and above, so those abilities are permanent.
const stageOf=name=>Math.max(0,...(SA_WEAPONS[name]||[]).map(o=>o.stage));
const PRICE_BY_STAGE=new Map(Object.entries(SA_PRICES).map(([name,price])=>[stageOf(name),price]));
export function saPrice(item){
  const name=baseName(item);if(SA_PRICES[name])return SA_PRICES[name];
  // A weapon that has no retail recipe is priced like the weapons of the nearest crystal stage.
  const stage=stageOf(name),near=[...PRICE_BY_STAGE.keys()].sort((a,b)=>Math.abs(a-stage)-Math.abs(b-stage)||a-b)[0];
  return PRICE_BY_STAGE.get(near);
}
export function saInfo(session,item){const current=saDefinition(item),options=saOptions(item);
  if(!options.length)return null;const p=saPrice(item);
  const gemKey=`craft_gem_${p.gem}`,removeAa=p.removeAa||0;
  return {current:current?{id:current.id,label:current.label,color:current.color,stage:current.stage}:null,legacy:!current&&Boolean(item.ability),gold:p.gold,gemKey,gems:p.gems,gemCount:getMaterialCount(session,gemKey),removeAa,removable:removeAa>0,aa:n(session.game.inventory.ancientAdena),equipped:isActuallyEquipped(session,item),options:options.map(o=>({id:o.id,label:o.label,color:o.color,stage:o.stage,key:soulCrystalKey(o.color,o.stage),count:getMaterialCount(session,soulCrystalKey(o.color,o.stage)),effects:saBonuses(item,o),description:o.description}))};
}
export function installWeaponSa(session,item,id){const info=saInfo(session,item),option=info?.options.find(o=>o.id===id);
  if(!option)return {ok:false,reason:'invalid_sa'};
  if(isActuallyEquipped(session,item))return {ok:false,reason:'sa_equipped'};
  if(item.sa)return {ok:false,reason:'sa_exists'};
  if(item.sealed||item.quality==='foundation')return {ok:false,reason:'sa_sealed'};
  if(getMaterialCount(session,option.key)<1)return {ok:false,reason:'no_soul_crystal'};
  if(getMaterialCount(session,info.gemKey)<info.gems)return {ok:false,reason:'no_sa_gems'};
  if(n(session.game.inventory.gold)<info.gold)return {ok:false,reason:'not_enough_gold'};
  spendMaterials(session,{[option.key]:1,[info.gemKey]:info.gems});session.game.inventory.gold-=info.gold;
  // Old fixed weapon abilities are replaced, not stacked with the selected SA.
  const legacy=equipmentTemplate.weaponAbility[item.kind];
  item.stats=(item.stats||[]).filter(s=>!legacy||s.name!==legacy.stat||s.label!==legacy.label);item.ability=null;
  item.sa={id:option.id,color:option.color,stage:option.stage};return {ok:true,sa:item.sa};
}
export function removeWeaponSa(session,item){const info=saInfo(session,item);if(!info||!item.sa)return {ok:false,reason:'no_sa'};if(isActuallyEquipped(session,item))return {ok:false,reason:'sa_equipped'};
  if(!info.removable)return {ok:false,reason:'sa_permanent'};
  if(n(session.game.inventory.ancientAdena)<info.removeAa)return {ok:false,reason:'not_enough_aa'};
  session.game.inventory.ancientAdena=n(session.game.inventory.ancientAdena)-info.removeAa;item.sa=null;return {ok:true};}
/** L2 effect values mapped to the existing game's stat scale. */
export function saBonuses(item,option=saDefinition(item)){
  if(!option)return {};
  const out={},put=(name,value,mul=false)=>{out[name]=mul?(out[name]||1)*value:(out[name]||0)+value;};
  for(const e of option.effects||[]){let value=e.op==='sub'?-e.value:e.value;const mul=e.op==='mul';
    const mapping={critRate:'criticalChance',accCombat:'accuracy',rEvas:'evasion',maxHp:'maxHp',maxMp:'maxMp',pAtkSpd:'attackSpeed',mAtkSpd:'castingSpeed',regMp:'mpRestoreSpeed',regHp:'hpRestoreSpeed',pAtk:'attack',mAtk:'attack',critDmg:'criticalDamage',critDmgAdd:'criticalDamage',vampiric:'vampirism',pvpPhysDmg:'pvpDamageMul',pvpPhysSkillsDmg:'pvpDamageMul',pvpMagicalDmg:'pvpDamageMul',mReuse:'skillCooltimeMul',mpConsum:'skillMpCostMul'};
    if(e.stat==='absorbDam'){put('vampirism',value/100);continue;}
    if(e.stat==='physicalMpConsumeRate'){put('skillMpCostMul',value,true);continue;}
    if(e.stat==='magicalMpConsumeRate')continue;
    if(e.stat==='weightLimit'){put('weightLimitMul',value,true);continue;}
    if(e.stat==='backCritRate'){put('backCriticalMul',value,true);continue;}
    let key=mapping[e.stat];if(!key)continue;
    if(e.stat.startsWith('pvp')&&out.pvpDamageMul)continue;
    if(mul){key=['criticalDamage','pvpDamageMul','skillCooltimeMul','skillMpCostMul'].includes(key)?key:key+'Mul';put(key,value,true);}
    else if(e.stat==='critRate')put(key,value/10);
    else if(e.stat==='critDmgAdd')put('criticalDamage',1+value/Math.max(1,item.lineage?.pAtk||200)*.1,true);
    else if(e.stat==='pAtk'||e.stat==='mAtk')put('attackMul',1+value/Math.max(1,item.lineage?.[e.stat]||200)*.25,true);
    else if(['regMp','regHp'].includes(e.stat))put(key,value*.1);
    else put(key,value);
  }
  return out;
}
export function saStat(session,item,name,isMul){const option=saDefinition(item);if(!option)return null;
  const value=saBonuses(item,option)[name];if(value===undefined)return null;
  if(option.hpBelow<100){const stats=session.game.gameClass?.stats||{};if(n(stats.hp)>getMaxHp(session)*option.hpBelow/100)return null;}
  return value;
}
export function soulCrystalState(session){const active=session?.game?.soulCrystal||null,inventory=session?.game?.inventory||{};
  const stock=Object.keys(SOUL_COLORS).flatMap(color=>Array.from({length:18},(_,stage)=>({color,stage,key:soulCrystalKey(color,stage),count:getMaterialCount(session,soulCrystalKey(color,stage))}))).filter(r=>r.count>0);
  return {active:active&&valid(active.color,active.stage)&&getMaterialCount(session,soulCrystalKey(active.color,active.stage))?{color:active.color,stage:active.stage}:null,stock,questLevel:40,aa:n(inventory.ancientAdena),seals:Object.fromEntries(Object.entries(SEAL_RATES).map(([color,rate])=>[color,{count:getMaterialCount(session,`seal_${color}`),rate}]))};
}
export function selectSoulCrystal(session,color,stage){if(color===null){session.game.soulCrystal=null;return {ok:true};}if(n(session.game.stats?.lvl)<40)return {ok:false,reason:'soul_level'};if(!valid(color,stage)||getMaterialCount(session,soulCrystalKey(color,stage))<1)return {ok:false,reason:'no_soul_crystal'};session.game.soulCrystal={color,stage};return {ok:true};}
function eligibleRule(npcId,stage,manual){return ABSORPTION[String(npcId)]?.rules.find(r=>r.manual===manual&&(r.maxStage!==null?stage<=r.maxStage:r.stages.includes(stage)));}
export function soulChargeInfo(session,mob){const active=soulCrystalState(session).active;if(!active)return {ok:false,reason:'no_active_crystal'};if(n(session.game.stats?.lvl)<40)return {ok:false,reason:'soul_level'};if(!mob||mob.currentHp<=0)return {ok:false,reason:'no_mob'};if(active.stage>=17)return {ok:false,reason:'soul_max_stage'};if(!eligibleRule(mob.mobId,active.stage,true))return {ok:false,reason:'soul_wrong_mob'};if(mob.currentHp>mob.hp*.5)return {ok:false,reason:'soul_hp'};if(mob.soulCharge)return {ok:false,reason:'soul_already_charged'};return {ok:true};}
export function chargeSoulCrystal(session,mob){const info=soulChargeInfo(session,mob);if(!info.ok)return info;mob.soulCharge={...soulCrystalState(session).active};return {ok:true};}
function grow(session,active,rule,random){if(active.stage>=17)return null;if(random()*100>=rule.chance)return {outcome:'unchanged',...active};const key=soulCrystalKey(active.color,active.stage);if(!spendMaterials(session,{[key]:1}))return null;addMaterial(session,soulCrystalKey(active.color,active.stage+1));session.game.soulCrystal={color:active.color,stage:active.stage+1};return {outcome:'success',color:active.color,from:active.stage,stage:active.stage+1};}
export function absorbHuntSoul(session,mob,random=Math.random){if(!mob||mob.currentHp>0||mob.soulAbsorbed)return null;const active=soulCrystalState(session).active;if(!active||n(session.game.stats?.lvl)<40)return null;const manual=eligibleRule(mob.mobId,active.stage,true),auto=eligibleRule(mob.mobId,active.stage,false);if(manual&&(mob.soulCharge?.color!==active.color||mob.soulCharge?.stage!==active.stage))return null;const rule=manual||auto;if(!rule)return null;mob.soulAbsorbed=true;return grow(session,active,rule,random);}
const EPIC_NPCS={zaken:29022,baium:29020,frintezza:29047,antharas:29019,valakas:29028};
export function absorbRaidSouls(sessions,bossName,random=Math.random){const results=[];const candidates=sessions.map(session=>{const active=soulCrystalState(session).active;return {session,active,rule:active?eligibleRule(EPIC_NPCS[bossName],active.stage,false):null};}).filter(c=>c.rule&&c.active.stage<17);
  const one=candidates.filter(c=>c.rule.scope!=='FULL_PARTY');const chosen=one.length?one[Math.min(one.length-1,Math.floor(random()*one.length))]:null;
  for(const c of candidates)if(c.rule.scope==='FULL_PARTY'||c===chosen){const result=grow(c.session,c.active,c.rule,random);if(result)results.push({userId:c.session.userId,...result});}return results;
}
export function exchangeSeals(session,counts){if(!counts||typeof counts!=='object'||Array.isArray(counts))return {ok:false,reason:'invalid_seals'};let aa=0;for(const [color,count] of Object.entries(counts)){if(!Object.hasOwn(SEAL_RATES,color)||!Number.isSafeInteger(count)||count<0||getMaterialCount(session,`seal_${color}`)<count)return {ok:false,reason:'invalid_seals'};aa+=count*SEAL_RATES[color];}const total=n(session.game.inventory.ancientAdena)+aa;if(!aa||!Number.isSafeInteger(total))return {ok:false,reason:'invalid_seals'};spendMaterials(session,Object.fromEntries(Object.entries(counts).map(([c,v])=>[`seal_${c}`,v])));session.game.inventory.ancientAdena=total;return {ok:true,aa};}
