import classTemplate from './getters/getGameClassStatsFromTemplate.js';
import {l2RawStat} from './l2Effects.js';
import DATA from '../../../template/l2PenaltyData.js';
import levels,{MAX_LEVEL} from '../../../template/levelsTemplate.js';
import {uniqueEquipped} from '../equipment/itemBonuses.js';
import {getMaterialCount,spendMaterials} from './materials.js';
const need=level=>levels.find(l=>l.lvl===level)?.needExp||levels.at(-1).needExp;
const grades={noGrade:0,NONE:0,D:1,C:2,B:3,A:4,S:5,S80:6,S84:7};
export {RECOVERY_SCROLLS,recoveryInfo} from '../../../template/l2RecoveryScrolls.js';
import {RECOVERY_SCROLLS,recoveryInfo} from '../../../template/l2RecoveryScrolls.js';
export function expertiseRank(level){return level>=84?7:level>=80?6:level>=76?5:level>=61?4:level>=52?3:level>=40?2:level>=20?1:0;}
export function gradePenalties(session){
 const rank=expertiseRank(session.game?.stats?.lvl||1),result={weapon:0,armor:0,jewelry:0};
 for(const item of uniqueEquipped(session.game?.equipmentStats||{})){
  const category=item.mainType==='weapon'?'weapon':item.mainType==='jewelry'?'jewelry':'armor';
  result[category]=Math.max(result[category],Math.min(4,Math.max(0,(grades[item.grade]||0)-rank)));
 }
 return result;
}
export function penaltyRows(session){
 const death=Math.min(15,Math.max(0,session.game?.deathPenalty||0)),grade=gradePenalties(session);
 return [...(death?[{id:5076,name:'Штраф за смерть',level:death,category:'death'}]:[]),...Object.entries(grade).filter(([,l])=>l).map(([category,level])=>({id:category==='weapon'?6209:6213,name:{weapon:'Штраф грейда: оружие',armor:'Штраф грейда: броня',jewelry:'Штраф грейда: бижутерия'}[category],level,category}))];
}
export function penaltyStat(session,stat,isMul=false,damageType){
 const magic=damageType==='magic';
 const names={attackMul:magic?'mAtk':'pAtk',defenceMul:magic?'mDef':'pDef',criticalChanceMul:'critRate',criticalDamage:'critDmg',speedMul:'runSpd',attackSpeedMul:'pAtkSpd',castSpeedMul:'mAtkSpd',accuracy:'accCombat',evasion:'rEvas'};
 // Reuse is inversely proportional to the appropriate attack/casting speed in this game.
 const inverse=stat==='skillCooltimeMul',name=inverse?(magic?'mAtkSpd':'pAtkSpd'):names[stat];
 if(!name)return isMul?1:0;
 let value=isMul?1:0;
 for(const row of penaltyRows(session))for(const node of DATA.skills[row.id][row.level-1])if(node.stat===name){
  if(isMul&&node.op==='mul')value*=inverse?1/node.value:node.value;
  if(!isMul&&node.op==='sub')value-=node.value;
 }
 return value;
}
function rescaleDeathStats(session){
 const stats=session.game.gameClass.stats,base=classTemplate(stats.name,session.game.stats.lvl);
 for(const key of ['attack','defence','pAtk','mAtk','pDef','mDef','maxHp','maxMp','maxCp','hpRestoreSpeed','mpRestoreSpeed','cpRestoreSpeed','speed'])if(Number.isFinite(base[key]))stats[key]=base[key];
}
/** One ledger per death prevents tick/reconnect/DoT from charging experience twice. */
export function recordDeath(session,{now=Date.now(),random=Math.random,kind='mob',siege=false,expMultiplier=1,penaltyMultiplier=1}={}){
 const game=session.game;if(!game?.stats||game.gameClass?.stats?.hp>0||game.deathLedger?.active)return game?.deathLedger;
 const stats=game.stats,before=stats.lvl||1,lucky=before<=9;
 const type=kind==='raid'?'Raid':kind==='pvp'?'Pvp':'Mob';
 expMultiplier*=l2RawStat(session,'reduceExpLostBy'+type,true,now);penaltyMultiplier*=l2RawStat(session,'reduceDeathPenaltyBy'+type,true,now);
 let loss=lucky||siege?0:Math.round(need(before)*DATA.expLost[before]/100*expMultiplier);
 let remaining=Math.max(0,stats.currentExp||0)-loss;
 while(remaining<0&&stats.lvl>1){stats.lvl--;remaining+=need(stats.lvl);}
 if(stats.lvl!==before&&game.gameClass?.stats?.name){const mp=game.gameClass.stats.mp,cp=game.gameClass.stats.cp;rescaleDeathStats(session,before);game.gameClass.stats.hp=0;game.gameClass.stats.mp=Math.min(mp||0,game.gameClass.stats.maxMp);game.gameClass.stats.cp=Math.min(cp||0,game.gameClass.stats.maxCp);}
 const actual=loss-Math.max(0,-remaining);stats.currentExp=Math.max(0,remaining);stats.needExp=stats.lvl>=MAX_LEVEL?0:need(stats.lvl)-stats.currentExp;
 if(!lucky&&!siege&&(kind!=='pvp'||game.karma>0)&&random()<.2*penaltyMultiplier)game.deathPenalty=Math.min(15,(game.deathPenalty||0)+1);
 game.deathLedger={active:true,at:now,lostExp:Math.max(0,actual),levelBefore:before,refunded:0};session.needsSave=true;return game.deathLedger;
}
export function refundDeathExp(session,share=0){
 const ledger=session.game.deathLedger;if(!ledger?.active||ledger.refunded)return 0;
 const amount=Math.floor(ledger.lostExp*Math.min(1,Math.max(0,share)));ledger.refunded=amount;
 const before=session.game.stats.lvl;
 session.game.stats.currentExp=(session.game.stats.currentExp||0)+amount;
 while(session.game.stats.lvl<MAX_LEVEL&&session.game.stats.currentExp>=need(session.game.stats.lvl)){session.game.stats.currentExp-=need(session.game.stats.lvl);session.game.stats.lvl++;}
 session.game.stats.needExp=session.game.stats.lvl>=MAX_LEVEL?0:need(session.game.stats.lvl)-session.game.stats.currentExp;
 if(session.game.stats.lvl!==before)rescaleDeathStats(session,before);
 return amount;
}
export function useRecoveryScroll(session,key,now=Date.now()){
 const scroll=recoveryInfo(String(key).replace('l2_','')),game=session.game;
 if(!scroll)return {ok:false,reason:'unknown_scroll'};
 if(game.gameClass?.stats?.hp<=0)return {ok:false,reason:'player_dead'};
 if(game.stats.lvl<scroll.min||game.stats.lvl>scroll.max)return {ok:false,reason:'scroll_level_mismatch'};
 if(game.karma>0)return {ok:false,reason:'chaotic_player'};
 if(!(game.deathPenalty>0))return {ok:false,reason:'no_death_penalty'};
 if((game.recoveryScrollAt||0)>now)return {ok:false,reason:'cooldown'};
 if(!getMaterialCount(session,key)||!spendMaterials(session,{[key]:1}))return {ok:false,reason:'not_enough_items'};
 game.deathPenalty--;game.recoveryScrollAt=now+10000;session.needsSave=true;
 return {ok:true,action:'recovery',level:game.deathPenalty};
}
