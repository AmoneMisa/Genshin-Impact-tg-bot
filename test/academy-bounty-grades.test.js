import test from 'node:test';
import assert from 'node:assert/strict';
import {getAcademyState,recordAcademyEvent,claimBounty,refreshBounties} from '../functions/game/academy/academy.js';
import {bountyGradeForLevel,bountyHuntReference} from '../functions/game/academy/bountyRewards.js';
import {levelNeed} from '../functions/game/player/vitality.js';
import {materialInfo} from '../functions/game/player/materials.js';
import {crystalKey} from '../functions/game/equipment/enchantItem.js';
import {EXP_RATE} from '../functions/game/player/vitality.js';
import {customSpBudget} from '../functions/game/player/spEconomy.js';
import {SHOT_PACK_PRICE,SHOT_PACK,SHOTS_PER_CAST} from '../template/shotsData.js';

test('bounties supplement eligible hunting income instead of skipping progression',()=>{
 for(const [level,grade] of bands)for(const quality of [1,5]){
  const state=getAcademyState(hero(level,quality),now),reference=bountyHuntReference(level),daily=state.bounties.day.quests;
  const target=Math.max(...daily.map(q=>q.target)),farmGold=reference.gold*target;
  const gold=daily.reduce((sum,q)=>sum+q.reward.gold,0);
  assert.ok(gold<=Math.max(3,farmGold*0.4+3),`${level}: excessive daily adena`);
  const exp=daily.reduce((sum,q)=>sum+q.reward.exp*EXP_RATE,0);
  assert.ok(exp<=levelNeed(level)*0.165+15,`${level}: excessive level share`);
  for(const q of daily)assert.ok(q.reward.exp<=reference.exp*q.target*(q.category==='experience'?0.3:0.05)+1);
  const sp=daily.reduce((sum,q)=>sum+q.reward.sp,0);
  assert.ok(sp<=customSpBudget(level)*0.9+3,`${level}: excessive SP`);
  const shots=daily[2].reward.materials[`spiritshot_${grade}`],perCast=SHOTS_PER_CAST[grade],unit=SHOT_PACK_PRICE[grade]/SHOT_PACK;
  assert.ok(shots>=perCast*3&&shots<=perCast*20);
  assert.ok(shots*unit<=Math.max(reference.gold*daily[2].target*0.25,perCast*3*unit)+unit);
  for(const q of state.bounties.week.quests)assert.equal(q.reward.luckCoins||0,q.category==='resources'&&quality>=4?1:0);
  const weekly=state.bounties.week.quests;
  assert.ok(weekly[0].reward.sp>=daily[1].reward.sp);
  assert.ok(weekly.reduce((sum,q)=>sum+q.reward.sp,0)<=reference.sp*weekly.reduce((sum,q)=>sum+q.target,0)*0.1+2);
 }
});

const now=Date.UTC(2026,9,11,12);
const hero=(level,quality=1,name='humanMystic')=>({userId:7,game:{stats:{lvl:level,currentExp:0},
 builds:{academy:{currentLvl:1+(quality-1)*6}},inventory:{gold:0,sp:0,materials:{}},
 vitality:{points:0,at:now},gameClass:{stats:{name}}}});
const bands=[[1,'noGrade'],[19,'noGrade'],[20,'D'],[39,'D'],[40,'C'],[51,'C'],[52,'B'],[60,'B'],
 [61,'A'],[75,'A'],[76,'S'],[79,'S'],[80,'S80'],[83,'S80'],[84,'S84'],[85,'S84']];

test('resource bounties pay 10–20 matching crystals daily and four times that weekly',()=>{
 for(const [level,grade] of bands.filter(([,grade])=>grade!=='noGrade'))for(const quality of [1,2,3,4,5]){
  const state=getAcademyState(hero(level,quality),now);
  for(const scope of ['day','week']){
   const quest=state.bounties[scope].quests.find(q=>q.category==='resources');
   assert.equal(quest.quality,quality);
   assert.equal(quest.reward.materials[crystalKey(grade)],[10,13,15,18,20][quality-1]*(scope==='week'?4:1));
  }
 }
});

test('pending old crystal rewards increase without rerolling progress or paying claimed rewards again',()=>{
 const s=hero(40,5);getAcademyState(s,now);
 const day=s.game.academy.bounties.day,week=s.game.academy.bounties.week;
 day.version=week.version=2;
 const resource=day.quests.find(q=>q.category==='resources');resource.progress=7;resource.reward.materials[crystalKey('C')]=5;
 const claimed=week.quests.find(q=>q.category==='resources');claimed.claimed=true;claimed.reward.materials[crystalKey('C')]=20;
 const before=structuredClone(claimed);
 s.game.builds.academy.currentLvl=1;
 const state=getAcademyState(s,now);
 assert.equal(resource.progress,7);assert.equal(resource.reward.materials[crystalKey('C')],20);
 assert.deepEqual(claimed,before);assert.equal(state.bounties.day.quests[1].quality,5);
 const snapshot=structuredClone(s.game.academy.bounties);getAcademyState(s,now);assert.deepEqual(s.game.academy.bounties,snapshot);
});

test('every grade has reachable daily XP/resources/consumables and stronger weekly rewards',()=>{
 for(const [level,grade] of bands)for(const quality of [1,5])for(const name of ['humanMystic','humanFighter']){
  const s=hero(level,quality,name),state=getAcademyState(s,now);
  assert.equal(bountyGradeForLevel(level).name,grade);
  assert.deepEqual(state.bounties.day.quests.map(q=>q.category),['experience','resources','consumables']);
  for(const scope of ['day','week'])for(const q of state.bounties[scope].quests){
   assert.equal(q.grade,grade);assert.equal(q.kind,'mobKills');assert.ok(q.target>0);
   assert.ok(q.reward.gold>0&&q.reward.sp>0);assert.equal(q.reward.exp>0,level<85);
   for(const item of q.reward.items)assert.notEqual(materialInfo(item.key).name,item.key,item.key);
  }
  const daily=state.bounties.day.quests.find(q=>q.category==='consumables');
  const weekly=state.bounties.week.quests.find(q=>q.category==='consumables');
  const key=Object.keys(daily.reward.materials).find(k=>k.startsWith(name==='humanMystic'?'spiritshot_':'soulshot_'));
  assert.ok(key?.endsWith('_'+grade));
  assert.equal(Object.keys(daily.reward.materials).some(k=>k.startsWith('scroll_')||k.startsWith('blessed_')),false);
  assert.equal(Object.keys(weekly.reward.materials).some(k=>k.startsWith('scroll_')||k.startsWith('blessed_')),false);
  assert.ok(weekly.target>daily.target);assert.ok(weekly.reward.gold>daily.reward.gold);
  recordAcademyEvent(s,'mob_kill',{mob:{level},count:100000,now});
  for(const q of state.bounties.day.quests){
   const paid=claimBounty(s,'day',q.id,now,()=>1);assert.equal(paid.ok,true);
   assert.equal(paid.gainedExp>0,level<85);
   for(const [key,count] of Object.entries(q.reward.materials))assert.ok(s.game.inventory.materials[key]>=count);
   const snapshot=structuredClone(s);assert.equal(claimBounty(s,'day',q.id,now).reason,'already_claimed');assert.deepEqual(s,snapshot);
  }
 }
});
test('low-level mobs, missing source data and zero counts cannot complete a high-grade bounty',()=>{
 const s=hero(76),quest=getAcademyState(s,now).bounties.day.quests[0];
 for(const input of [{mob:{level:10},count:1000},{count:1000},{mob:{level:76},count:0},{mob:{level:76},count:-10},{mob:{level:76},count:NaN}]){
  assert.equal(recordAcademyEvent(s,'mob_kill',{...input,now}).moved,0);
 }
 assert.equal(quest.progress,0);recordAcademyEvent(s,'mob_kill',{mob:{level:76},count:1,now});
 assert.equal(s.game.academy.bounties.day.quests[0].progress,1);
});
test('inventory capacity blocks the entire reward without losing the completed bounty',()=>{
 const s=hero(40);getAcademyState(s,now);recordAcademyEvent(s,'mob_kill',{mob:{level:40},count:1000,now});
 s.game.inventory.materials=Object.fromEntries(Array.from({length:80},(_,i)=>['test_'+i,1]));
 const q=s.game.academy.bounties.day.quests.find(q=>q.category==='resources'),before=structuredClone(s);
 assert.equal(claimBounty(s,'day',q.id,now).reason,'inventory_full');assert.deepEqual(s,before);
 s.game.inventory.materials={};assert.equal(claimBounty(s,'day',q.id,now,()=>1).ok,true);
});
test('experience reward levels up normally and daily/weekly sigils use their real period keys',()=>{
 for(const scope of ['day','week']){
  const s=hero(40);s.game.stats.currentExp=levelNeed(40)-1;getAcademyState(s,now);
  recordAcademyEvent(s,'mob_kill',{mob:{level:40},count:100000,now});
  const q=s.game.academy.bounties[scope].quests[0];const result=claimBounty(s,scope,q.id,now,()=>0);
  assert.equal(result.token,true);assert.equal(s.game.inventory.materials.clan_boss_token,1);
  assert.equal(s.game.stats.lvl,41);
 }
});
test('legacy periods retain completed rewards and relative progress without rerolling on level changes',()=>{
 const s=hero(40);s.game.academy={bounties:{day:{key:'2026-10-11',quality:1,quests:[
  {id:'day-0',kind:'crafts',progress:2,target:2,claimed:true,reward:{gold:4800,sp:20}},
  {id:'day-1',kind:'enchants',progress:1,target:2,claimed:false,reward:{gold:4800,sp:20}},
  {id:'day-2',kind:'mobKills',progress:30,target:30,claimed:false,reward:{gold:4800,sp:20}},
 ]}}};
 const state=refreshBounties(s,now).day;
 assert.equal(state.quests[0].claimed,true);assert.deepEqual(state.quests[0].reward,{gold:4800,sp:20});
 assert.equal(state.quests[1].progress,Math.floor(state.quests[1].target/2));
 assert.equal(state.quests[2].progress,state.quests[2].target);
 const snapshot=structuredClone(state);s.game.stats.lvl=52;s.game.builds.academy.currentLvl=30;
 assert.deepEqual(refreshBounties(s,now).day,snapshot);assert.equal(claimBounty(s,'day','day-0',now).reason,'already_claimed');
});
