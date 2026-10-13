import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import {enchantL2Skill,enchantOffer,enchantFields} from '../functions/game/player/l2SkillEnchant.js';
import {getSkillPowerMultiplier,getSkillCostMultiplier} from '../functions/game/player/skillEnchant.js';
import {recordDeath,gradePenalties,penaltyStat,useRecoveryScroll,refundDeathExp} from '../functions/game/player/deathPenalties.js';
import {restoreRevivalVitals} from '../functions/game/player/revivalVitals.js';
import {createMiniAppState} from '../miniapp/state.js';
import {rollGacha,resolveGacha,getGachaState} from '../miniapp/gacha.js';
import {dailyGacha} from '../functions/game/equipment/gachaDaily.js';
import {materialIcon} from '../webapp/material-icons.js';
import {l2SkillIcon} from '../webapp/art/l2-extra-art.js';
import levels from '../template/levelsTemplate.js';
const hero=(level=85)=>{
 const s={userId:1,game:{stats:{lvl:level,currentExp:0},inventory:{gold:1e9,sp:1e8,ancientAdena:1e6,luckCoins:20,materials:{l2_6622:5,l2_9627:5,l2_9626:5,l2_9625:5,crystal_S:100},equipment:{items:[]},gacha:{items:[]}},equipmentStats:{},effects:[],builds:{},learnedSkills:{}}};
 changeClass(s,'archmage');updateStats(s);for(const k of s.game.gameClass.skills)s.game.learnedSkills[k.l2Id]=true;return s;
};
test('High Five enchant uses original prices/chances, a first-step book, and the selected route only',()=>{
 const s=hero(),a=enchantOffer(s,1230,{route:1});assert.equal(a.ok,true);assert.equal(a.chance,.97);assert.deepEqual(a.cost.items,{l2_6622:1});
 const wallet=structuredClone(s.game.inventory);assert.equal(enchantL2Skill(s,1230,{route:1,random:()=>0}).level,1);
 assert.equal(s.game.inventory.gold,wallet.gold-a.cost.gold);assert.equal(s.game.inventory.sp,wallet.sp-a.cost.sp);assert.equal(s.game.inventory.materials.l2_6622,4);
 assert.deepEqual(enchantOffer(s,1230).cost.items,{});assert.equal(enchantL2Skill(s,1230,{route:2}).reason,'other_route_chosen');
 assert.equal(enchantFields(1230,1,1).power,109);assert.equal(enchantFields(1230,2,30).mpConsume,31);
 assert.equal(getSkillPowerMultiplier({l2Id:1230,l2EnchantRoute:1,enchantLevel:1}),109/108);
 assert.ok(getSkillCostMultiplier({l2Id:1230,l2EnchantRoute:2,enchantLevel:30})<.6);
});
test('Mastery charges five times, consumes its own book, and preserves level on failure',()=>{
 const s=hero();s.game.skillEnchants={1230:{route:1,level:1}};
 const normal=enchantOffer(s,1230),safe=enchantOffer(s,1230,{mode:'mastery'});
 assert.equal(safe.cost.gold,normal.cost.gold*5);assert.equal(safe.cost.sp,normal.cost.sp*5);
 const result=enchantL2Skill(s,1230,{mode:'mastery',random:()=>.999});assert.equal(result.success,false);assert.equal(result.level,1);assert.equal(s.game.inventory.materials.l2_9627,4);
 assert.equal(enchantL2Skill(s,1230,{random:()=>.999}).level,0);
});
test('route changes lose at most three levels, untraining refunds original SP, invalid requests are atomic',()=>{
 const s=hero();s.game.skillEnchants={1230:{route:1,level:10}};
 assert.equal(enchantL2Skill(s,1230,{mode:'change',route:2,random:()=>.99}).level,7);
 const offer=enchantOffer(s,1230,{mode:'untrain'}),sp=s.game.inventory.sp;
 assert.equal(enchantL2Skill(s,1230,{mode:'untrain'}).level,6);assert.equal(s.game.inventory.sp,sp+offer.refundSp);
 const low=hero(75),before=structuredClone(low.game.inventory);assert.equal(enchantL2Skill(low,1230).reason,'enchant_class_required');assert.deepEqual(low.game.inventory,before);
 s.game.inventory.materials.l2_9627=0;const saved=structuredClone(s.game);assert.equal(enchantL2Skill(s,1230,{mode:'mastery'}).ok,false);assert.deepEqual(s.game,saved);
});
test('death charges EXP once, persists through login, and recovery is grade-gated and consumed once',()=>{
 const s=hero(47),need=levels.find(l=>l.lvl===47).needExp;s.game.stats.currentExp=Math.floor(need*.5);s.game.gameClass.stats.hp=0;
 const ledger=recordDeath(s,{now:1000,random:()=>0});assert.ok(ledger.lostExp>0);const exp=s.game.stats.currentExp;recordDeath(s,{now:2000,random:()=>0});assert.equal(s.game.stats.currentExp,exp);assert.equal(s.game.deathPenalty,1);
 const state=createMiniAppState(s,{user:{id:1}});assert.equal(state.player.dead,true);assert.equal(state.player.penalties[0].id,5076);
 const refunded=refundDeathExp(s,.5);assert.equal(refunded,Math.floor(ledger.lostExp*.5));assert.equal(refundDeathExp(s,.5),0);
 restoreRevivalVitals(s);s.game.inventory.materials.l2_8596=2;s.game.inventory.materials.l2_8594=2;
 assert.equal(useRecoveryScroll(s,'l2_8594',3000).reason,'scroll_level_mismatch');assert.equal(s.game.inventory.materials.l2_8594,2);
 assert.equal(useRecoveryScroll(s,'l2_8596',3000).ok,true);assert.equal(s.game.inventory.materials.l2_8596,1);assert.equal(useRecoveryScroll(s,'l2_8596',4000).ok,false);
});
test('death can delevel without reviving; beginners and siege deaths have no loss or debuff',()=>{
 const s=hero(47);s.game.gameClass.stats.hp=0;recordDeath(s,{random:()=>0});assert.equal(s.game.stats.lvl,46);assert.equal(s.game.gameClass.stats.hp,0);assert.ok(s.game.stats.currentExp>0);
 for(const [level,siege] of [[9,false],[47,true]]){const h=hero(level);h.game.gameClass.stats.hp=0;assert.equal(recordDeath(h,{siege,random:()=>0}).lostExp,0);assert.equal(h.game.deathPenalty,undefined);}
});
test('overgrade uses three independent categories, not the number of worn pieces',()=>{
 const s=hero(40),armor={mainType:'armor',grade:'A',type:'a',slots:['up']};s.game.equipmentStats={rightHand:{mainType:'weapon',grade:'B',type:'b',slots:['rightHand']},up:armor,necklace:{mainType:'jewelry',grade:'S',type:'j',slots:['necklace']}};
 assert.deepEqual(gradePenalties(s),{weapon:1,armor:2,jewelry:3});const speed=penaltyStat(s,'speedMul',true);assert.equal(speed,.6944*.5787);
 s.game.equipmentStats.hands={...armor,type:'gloves',slots:['hands']};assert.equal(penaltyStat(s,'speedMul',true),speed);
 assert.equal(penaltyStat(s,'attackMul',true,'magic'),1);assert.equal(penaltyStat(s,'accuracy'),-16);
 s.game.stats.lvl=85;assert.deepEqual(gradePenalties(s),{weapon:0,armor:0,jewelry:0});
});
test('three daily rolls are shared across spirals and every read preserves the decreasing count',()=>{
 const s=hero();for(const [index,type] of ['newbie','common','rare'].entries()){assert.equal(rollGacha(s,type,{random:()=>0}).paymentMode,'free');assert.equal(getGachaState(s).freeSpins,2-index);assert.equal(resolveGacha(s,'save').ok,true);assert.equal(getGachaState(s).freeSpins,2-index);}
 assert.equal(rollGacha(s,'newbie',{random:()=>0}).paymentMode,'currency');assert.equal(getGachaState(s).freeSpins,0);
 dailyGacha(s,Date.now()+86400000);assert.equal(s.game.gachaDaily.remaining,3);
});
test('paid B/A, S and S80/S84 spins charge the right wallets atomically',()=>{
 for(const [type,extra] of [['rare','ancientAdena'],['royal','crystal_S'],['goddess','luckCoins']]){
  const s=hero();dailyGacha(s).remaining=0;const row=getGachaState(s).spirals.find(r=>r.id===type),before=structuredClone(s.game.inventory);
  assert.equal(rollGacha(s,type,{random:()=>0}).ok,true);assert.equal(s.game.inventory.gold,before.gold-row.spinCost.gold);
  if(extra==='crystal_S')assert.equal(s.game.inventory.materials.crystal_S,before.materials.crystal_S-row.materialCost.crystal_S);else assert.equal(s.game.inventory[extra],before[extra]-row.spinCost[extra]);
  const poor=hero();dailyGacha(poor).remaining=0;if(extra==='crystal_S')poor.game.inventory.materials.crystal_S=0;else poor.game.inventory[extra]=0;
  const wallet=structuredClone(poor.game.inventory);assert.equal(rollGacha(poor,type).ok,false);for(const key of ['gold','ancientAdena','luckCoins','materials'])assert.deepEqual(poor.game.inventory[key],wallet[key]);
 }
});
test('reward names and numeric skill/item IDs use original client icons',()=>{
 for(const key of ['l2_736','l2_737','l2_1869','l2_6622','l2_9627','l2_8596'])assert.match(materialIcon(key),/\/art\/l2-extra\/icon-/);
 for(const id of [1230,1040,5076,6209,6213])assert.match(l2SkillIcon(id),/\/art\/l2-extra\/icon-/);
 const s=hero();s.game.gachaTempItem={version:2,rewardKind:'consumable',rewardRef:'scroll_escape',amount:1};s.game.gachaTempType='newbie';assert.equal(getGachaState(s).pending.item.translatedName,'Свиток возвращения');assert.equal(getGachaState(s).pending.item.rewardRef,'l2_736');
});
