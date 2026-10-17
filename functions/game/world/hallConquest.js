import {HALL_SCENARIOS,HALL_NPC_DEFS} from '../../../template/hallScenarios.js';
import holdings from '../../../template/worldHoldings.js';
import {enterHolding,leaveHolding,atHoldingEntrance} from './holdingEntry.js';
import {findPath,advancePath} from './navigation.js';
import getSpeed from '../player/getters/getSpeed.js';
import getDefence from '../player/getters/getDefence.js';
import getMaxHp from '../player/getters/getMaxHp.js';
import getIncomingDamageModifier from '../player/getters/getIncomingDamageModifier.js';
import {attributeProfile,resistFactor} from '../equipment/attributes.js';
import {l2ActionBlock,l2MoveMultiplier,applyL2Effect,l2OnDamageReceived,l2PreventDeath} from '../player/l2Effects.js';
import {BASIC_ATTACK,weaponSpatial,skillSpatial,inSkillReach} from '../hunt/huntSpatial.js';
import calcDamage from '../boss/calcDamage.js';
import castSkill from '../player/castSkill.js';
import usableSkill from '../player/isPlayerCanUseSkill.js';
import {getEffectiveSkillCost} from '../player/skillEnchant.js';
import {guardReduction} from '../player/skillEffects.js';
import payCost from '../player/skillUsagePayCost.js';
import setCooldown from '../player/setSkillCooldown.js';
import {armShots,clearShots} from '../shots/shots.js';
import {spendAmmo} from '../shots/ammo.js';
import {spendMaterials,addMaterial} from '../player/materials.js';
import {partyMembers} from '../party/party.js';
import {playerName} from '../player/playerName.js';

// Pinned GameTimeTaskManager: midnight reference, six game days per real day.
export const gameHour=now=>{const midnight=new Date(now);midnight.setHours(0,0,0,0);return Math.floor((now-midnight.getTime())/600000)%24;};
export const hallScenario=h=>HALL_SCENARIOS[h?.id]||null;
const fail=reason=>({ok:false,reason}),cid=c=>String(c?._id||''),uid=s=>String(s.userId);
const snapshot=c=>({clanId:cid(c),name:c.name,leaderId:String(c.owner)});
const ownedElsewhere=(clan,h,records,now)=>Boolean(clan.hall?.estate?.until>now||records.some(r=>r._id!==h.id&&String(r.owner?.clanId)===cid(clan)));
const near=(a,b,distance=180)=>Math.hypot(a.x-b.x,a.y-b.y)*2000<=distance;
export function nextHallRegistration(rule,now){const d=new Date(now),[days,months,years,hour,minute]=rule.schedule;d.setDate(d.getDate()+days);d.setMonth(d.getMonth()+months);d.setFullYear(d.getFullYear()+years);d.setHours(hour,minute,0,0);return d.getTime();}
export function ensureHallContest(record,h,now=Date.now()){
 const rule=hallScenario(h);if(!rule)return null;
 if(record.siege?.version===2)return record.siege;
 // Old generic flag encounters cannot award a High Five hall after migration.
 const closesAt=nextHallRegistration(rule,now);
 record.siege={version:2,kind:'hall',scenario:rule.kind,id:`${h.id}:${closesAt}`,registrationClosesAt:closesAt,startsAt:closesAt+rule.preparationMs,endsAt:closesAt+rule.preparationMs+rule.durationMs,phase:'registration',registrations:{},players:{},objectives:[],rewarded:{},bags:{},damage:{},settled:false,winner:null};
 record.markModified?.('siege');return record.siege;
}
function projection(rule,h){
 const points=rule.spawns.length?rule.spawns:rule.flagPositions||rule.arenas;
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y),minX=Math.min(...xs),minY=Math.min(...ys),maxX=Math.max(...xs),maxY=Math.max(...ys);
 return p=>({x:.08+.84*(p.x-minX)/Math.max(1,maxX-minX),y:.08+.76*(p.y-minY)/Math.max(1,maxY-minY),original:{x:p.x,y:p.y,z:p.z}});
}
function unit(id,key,point,extra={}){const def=HALL_NPC_DEFS[id];return {id:key,npcId:id,name:def.name,hp:def.hp,maxHp:def.hp,...point,...extra};}
function buildDefenders(s,rule,h,final=false){
 const project=projection(rule,h);s.objectives=[];
 for(const [id,r] of Object.entries(s.registrations).filter(([,r])=>!r.eliminated)){
  if(!final&&r.owner)continue;
  const index=final?(r.owner?5:6):r.slot,point=project(rule.flagPositions[index]);
  s.objectives.push(unit(r.defenderId,'defender:'+id,point,{clanId:id,main:true}));
 }
}
function initialize(s,rule,h,now){
 s.phase='battle';s.startedAt=now;
 const rows=Object.values(s.registrations);
 if(rule.kind==='defenders'){
  if(rows.length<2){s.phase='cancelled';s.settled=true;return;}
  if(rows.some(r=>!rule.defenders.includes(r.defenderId))){s.phase='cancelled';s.settled=true;return;}
  s.round='qualifying';buildDefenders(s,rule,h);
  if(s.objectives.length===1&&rows.some(r=>r.owner)){s.round='pause';s.resumeAt=now+rule.finalPauseMs;}
 }else if(rule.kind==='rainbow'){
  const accepted=rows.sort((a,b)=>(b.decrees||0)-(a.decrees||0)).slice(0,4);s.accepted=accepted.map(r=>r.clanId);
  if(accepted.length<2){s.phase='cancelled';s.settled=true;return;}
  s.arenas=accepted.map((r,i)=>({clanId:r.clanId,gourdHp:HALL_NPC_DEFS[rule.gourdIds[i]].hp,maxHp:HALL_NPC_DEFS[rule.gourdIds[i]].hp}));
  s.wordIndex=-1;s.nextWordAt=s.startsAt+rule.wordDelayMs;s.nextChestAt=s.startsAt+rule.chestIntervalMs;s.chests=accepted.map(()=>[]);
  const project=projection(rule,h);s.objectives=accepted.flatMap((r,i)=>[unit(rule.gourdIds[i],'gourd:'+i,project({...rule.arenas[i],x:rule.arenas[i].x+150,y:rule.arenas[i].y+150}),{arena:i,clanId:r.clanId,role:'gourd'}),unit(rule.yetiIds[i],'yeti:'+i,project(rule.yetis_spawn[i]),{arena:i,clanId:r.clanId,role:'yeti'})]);
 }else{
  if(rule.registrationRequired&&!rows.length){s.phase='cancelled';s.settled=true;return;}
  const project=projection(rule,h);s.objectives=rule.spawns.map((spawn,i)=>unit(spawn.npcId,'guard:'+i,project(spawn),{main:spawn.npcId===rule.bossId,respawnMs:spawn.respawnSeconds*1000}));
  for(const boss of [...s.objectives].filter(n=>n.main))for(const minion of HALL_NPC_DEFS[boss.npcId].minions||[])for(let i=0;i<minion.count;i++)s.objectives.push(unit(minion.id,`minion:${minion.id}:${i}`,{x:boss.x,y:boss.y,original:boss.original},{respawnMs:minion.respawnSeconds*1000}));
 }
}
function finish(record,h,s,winner,now,records){
 s.winner=winner;s.settled=true;s.phase=winner?'finished':'draw';s.finishedAt=now;s.cleanupAt=now+(s.scenario==='rainbow'?120000:0);s.objectives.forEach(n=>n.autoTarget=null);
 // The hall is one global property; a clan cannot own two halls.
 if(winner){for(const r of records)if(r!==record&&holdings.find(h=>h.id===r._id)?.kind==='hall'&&String(r.owner?.clanId)===winner.clanId){r.owner=null;r.markModified?.('owner');}record.owner={clanId:winner.clanId,name:winner.name,leaderId:winner.leaderId,defenderId:winner.defenderId,capturedAt:now};}
 else record.owner=null;
 s.nextRegistrationAt=nextHallRegistration(hallScenario(h),now);record.markModified?.('owner');record.markModified?.('siege');
}
function defenderDefeated(record,h,s,target,now,records){
 s.registrations[target.clanId].eliminated=true;
 const alive=Object.values(s.registrations).filter(r=>!r.eliminated),attackers=alive.filter(r=>!r.owner);
 if(s.round==='qualifying'&&alive.some(r=>r.owner)&&attackers.length===1){s.round='pause';s.resumeAt=now+hallScenario(h).finalPauseMs;}
 else if(alive.length<=1)finish(record,h,s,alive[0]||null,now,records);
}
function advanceDefenderNpcs(record,h,s,now,records){
 if(s.round==='pause'||!Object.values(s.players).some(p=>p.hp>0&&p.seenAt>=now-10000))return;
 const nodes=s.objectives.filter(n=>n.hp>0),elapsed=Math.min(2,Math.max(0,(now-(s.defenderTickAt||now))/1000));s.defenderTickAt=now;
 for(const n of nodes){
  if(n.hp<=0||s.settled||s.round==='pause')break;
  const target=nodes.filter(t=>t.clanId!==n.clanId&&t.hp>0).sort((a,b)=>Math.hypot(a.x-n.x,a.y-n.y)-Math.hypot(b.x-n.x,b.y-n.y))[0];if(!target)continue;
  const def=HALL_NPC_DEFS[n.npcId],other=HALL_NPC_DEFS[target.npcId],dx=target.x-n.x,dy=target.y-n.y,d=Math.hypot(dx,dy);
  if(d*2000>def.attackRange){const distance=Math.min(d,def.runSpeed*elapsed/2000);if(d){n.x+=dx/d*distance;n.y+=dy/d*distance;}continue;}
  if((n.nextAttackAt||0)>now)continue;n.nextAttackAt=now+500000/Math.max(1,def.attackSpeed);
  target.hp=Math.max(0,target.hp-Math.max(1,Math.floor(70*def.pAtk/Math.max(1,other.pDef))));
  if(!target.hp)defenderDefeated(record,h,s,target,now,records);
 }
}
export function advanceHallContest(record,h,now=Date.now(),records=[],random=Math.random){
 const rule=hallScenario(h),s=ensureHallContest(record,h,now);if(!s)return;
 if(s.settled){if(now>=(s.cleanupAt||s.finishedAt||Infinity)){
  const next=s.nextRegistrationAt||nextHallRegistration(rule,now),lastResult={winner:s.winner,finishedAt:s.finishedAt,phase:s.phase};record.siege=null;
  const fresh=ensureHallContest(record,h,now);Object.assign(fresh,{registrationClosesAt:next,startsAt:next+rule.preparationMs,endsAt:next+rule.preparationMs+rule.durationMs,lastResult,id:`${h.id}:${next}`});
 }return;}
 if(now>=s.registrationClosesAt&&s.phase==='registration'){
  if(record.owner){const owner=record.owner;s.registrations[owner.clanId]||={...owner,owner:true,members:[owner.leaderId].filter(Boolean),defenderId:owner.defenderId||rule.defenders?.[0],slot:5,decrees:10000};}
  s.previousOwner=record.owner;record.owner=null;record.markModified?.('owner');s.phase='preparation';
 }
 if(now>=s.startsAt&&s.phase==='preparation'){
  if(h.id==='hall:64'&&gameHour(now)>6){const delay=(24-gameHour(now))*600000;s.startsAt=now+delay;s.endsAt=s.startsAt+rule.durationMs;return;}
  initialize(s,rule,h,now);
  if(s.settled){record.owner=s.previousOwner||null;s.finishedAt=now;s.cleanupAt=now;s.nextRegistrationAt=nextHallRegistration(rule,now);record.markModified?.('owner');}
 }
 if(s.phase==='battle'){
  if(rule.kind==='defenders'&&s.round==='pause'&&now>=s.resumeAt){s.round='final';buildDefenders(s,rule,h,true);}
  if(rule.kind==='defenders')advanceDefenderNpcs(record,h,s,now,records);
  if(rule.kind==='rainbow'){
   if(now>=s.nextWordAt){s.wordIndex=Math.min(rule.words.length-1,Math.floor(random()*rule.words.length));s.nextWordAt=now+rule.wordIntervalMs;}
   if(now>=s.nextChestAt){const project=projection(rule,h);s.objectives=s.objectives.filter(n=>n.role!=='chest'||n.hp>0);s.accepted.forEach((id,i)=>{const alive=s.objectives.filter(n=>n.role==='chest'&&n.arena===i&&n.hp>0);if(alive.length<4)s.objectives.push(unit(rule.chestId,`chest:${i}:${now}`,project(rule.chests_spawn[i]),{arena:i,clanId:id,role:'chest'}));});s.nextChestAt=now+rule.chestIntervalMs;}
  }
  for(const n of s.objectives)if(n.hp<=0&&n.respawnAt&&now>=n.respawnAt){n.hp=n.maxHp;n.respawnAt=null;}
  if(now>=s.endsAt)finish(record,h,s,null,now,records);
 }
 record.markModified?.('siege');
}
function registration(record,h,session,clan,body,now,records){
 const rule=hallScenario(h),s=record.siege,id=cid(clan),user=uid(session),leader=String(clan.owner)===user;
 if(s.phase!=='registration'||now>=s.registrationClosesAt)return fail('siege_registration_closed');
 if(!leader||Number(clan.level)<rule.minClanLevel)return fail('siege_leader_required');
 if(!atHoldingEntrance(session,h))return fail('holding_region_required');
 if(ownedElsewhere(clan,h,records,now))return fail('hall_already_reserved');
 if(records.some(r=>r!==record&&hallScenario(holdings.find(h=>h.id===r._id))&&!r.siege?.settled&&r.siege?.registrations?.[id]))return fail('hall_already_registered_elsewhere');
 if(body.action==='siege_unregister'){
  const old=s.registrations[id];if(!old)return fail('siege_not_registered');
  if(rule.kind==='rainbow')addMaterial(session,'l2_8034',Math.floor(old.decrees/2));delete s.registrations[id];return {ok:true};
 }
 if(s.registrations[id])return fail('siege_already_registered');
 if(Object.keys(s.registrations).length>=rule.maxClans)return fail('hall_registration_full');
 const occupiedSlots=new Set(Object.values(s.registrations).map(r=>r.slot));
 let slot=0;while(occupiedSlots.has(slot))slot++;
 const r={...snapshot(clan),members:[user],slot,owner:false};
 if(rule.kind==='defenders'){
  if(!rule.defenders.includes(Number(body.defenderId)))return fail('hall_defender_required');
  if(Object.values(s.registrations).some(r=>r.defenderId===Number(body.defenderId)))return fail('hall_defender_taken');
  r.defenderId=Number(body.defenderId);
  if(body.payment==='quest'){if(!spendMaterials(session,{['l2_'+rule.questItem]:1}))return fail('hall_quest_item_required');}
  else {if(session.game.inventory.gold<rule.registrationGold)return fail('not_enough_gold');session.game.inventory.gold-=rule.registrationGold;}
 }
 if(rule.kind==='rainbow'){
  if((clan.members?.length||0)<rule.minParty)return fail('hall_party_required');
  const amount=Number(session.game.inventory.materials?.l2_8034)||0;if(amount<1)return fail('hall_decree_required');
  if(!spendMaterials(session,{l2_8034:amount}))return fail('hall_decree_required');r.decrees=amount;
 }
 s.registrations[id]=r;return {ok:true};
}
function updatePlayer(s,session,clan,now){
 const p=s.players[uid(session)];if(!p)return null;
 const stats=session.game.gameClass.stats;
 if(p.pendingDamage){const cp=Math.min(Math.max(0,stats.cp||0),p.pendingDamage);stats.cp=Math.max(0,(stats.cp||0)-cp);stats.hp=Math.max(0,stats.hp-Math.max(0,p.pendingDamage-cp));l2OnDamageReceived(session,null,p.pendingDamage,now);p.pendingDamage=0;if(!stats.hp)l2PreventDeath(session,now);}
 const block=l2ActionBlock(session,{move:true},now);if(block)p.path=[];
 advancePath(p,now,block?0:getSpeed(session)*l2MoveMultiplier(session,now));
 p.seenAt=now;p.hp=session.game.gameClass.stats.hp;p.clanId=cid(clan);p.level=session.game.stats.lvl;
 p.combat={pDef:Math.max(1,getDefence(session,undefined,'physical')),mDef:Math.max(1,getDefence(session,undefined,'magic')),attributes:attributeProfile(session),incoming:getIncomingDamageModifier(session),guard:guardReduction(session,now)};
 Object.assign(session.game.world,{x:p.x,y:p.y,path:p.path,moveAt:p.moveAt});return p;
}
function npcCombat(s,session,clan,p,now,random){
 if(s.phase!=='battle'||s.round==='pause')return;
 const nodes=s.objectives.filter(n=>n.hp>0&&!n.role&&n.clanId!==cid(clan)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)).slice(0,12);
 for(const n of nodes){
  const def=HALL_NPC_DEFS[n.npcId];if(!def)continue;
  const dx=p.x-n.x,dy=p.y-n.y,d=Math.hypot(dx,dy),engaged=n.aggro===uid(session)||n.clanId&&d<=.3||def.aggressive&&d<=.15;
  if(!engaged)continue;
  const elapsed=Math.min(2,Math.max(0,(now-(n.combatAt||now))/1000));n.combatAt=now;
  if(d*2000>def.attackRange){const distance=Math.min(d,def.runSpeed*elapsed/2000);if(d){n.x+=dx/d*distance;n.y+=dy/d*distance;}continue;}
  if((n.nextAttackAt||0)>now)continue;n.nextAttackAt=now+500000/Math.max(1,def.attackSpeed);
  const damage=Math.max(1,Math.floor(70*def.pAtk/Math.max(1,getDefence(session,session.game.gameClass,'physical'))*getIncomingDamageModifier(session)*resistFactor(attributeProfile(session).resist,null,0)));
  session.game.gameClass.stats.hp=Math.max(0,session.game.gameClass.stats.hp-damage);p.hp=session.game.gameClass.stats.hp;l2OnDamageReceived(session,null,damage,now,random);
  if(!p.hp&&!l2PreventDeath(session,now)){p.path=[];p.autoTarget=null;break;}
 }
}
function strike(record,h,session,clan,target,now,records,random,skillIndex=null){
 const s=record.siege,rule=hallScenario(h),p=s.players[uid(session)],def=HALL_NPC_DEFS[target?.npcId];
 if(!target||target.hp<=0||!def)return fail('objective_dead');
 if(target.clanId===cid(clan)&&!['chest','enraged'].includes(target.role))return fail('hall_friendly_target');
 if(rule.kind==='rainbow'&&(target.role!=='chest'&&target.npcId!==rule.enragedYetiId||target.arena!==s.accepted.indexOf(cid(clan))))return fail('hall_wrong_arena');
 if(rule.kind==='defenders'&&(s.round==='pause'||s.registrations[cid(clan)]?.eliminated||s.round==='qualifying'&&s.registrations[cid(clan)]?.owner))return fail('hall_round_wait');
 const weapon=weaponSpatial(session,now),skill=skillIndex===null?{...BASIC_ATTACK,cost:weapon.costMp||0}:session.game.gameClass.skills[skillIndex];
 if(!skill)return fail('skill_locked');
 if(rule.kind==='rainbow'&&target.role==='chest'&&skillIndex!==null)return fail('hall_bare_hands_required');
 if(rule.kind==='rainbow'&&target.role==='chest'&&Object.values(session.game.equipmentStats||{}).some(item=>item?.isFilled&&item.mainType==='weapon'))return fail('hall_bare_hands_required');
 const geometry=skillSpatial(session,skill,now);
 if(!geometry)return fail('unsupported_skill');
 if(!inSkillReach(p,target,geometry))return fail('target_too_far');
 if(p.nextAttackAt>now)return fail('cooldown');
 const usable=usableSkill(session,skill,now);if(usable)return fail(({1:'not_enough_resource',2:'cooldown',3:'skill_locked',4:'no_ammo',5:'effect_blocked'})[usable]);
 if(skillIndex!==null&&geometry.windup>0){
  if(!p.cast||p.cast.target!==target.id||p.cast.index!==skillIndex){p.cast={target:target.id,index:skillIndex,until:now+geometry.windup};p.path=[];return {ok:true,casting:true};}
  if(now<p.cast.until)return {ok:true,casting:true};delete p.cast;
 }
 const cost=getEffectiveSkillCost(skill,getMaxHp(session),session);payCost(session,cost.costHp>0?'hp':'mp',cost.costHp||cost.cost);spendAmmo(session,skill);armShots(session,skill);
 const boss={name:def.name,hp:target.maxHp,currentHp:target.hp,stats:{lvl:def.level},hunt:{defence:def.pDef,pDef:def.pDef,mDef:def.mDef,resist:def.resist},debuffs:target.debuffs||[],listOfDamage:[],minions:[],eventLog:[],markModified(){}};
 let damage=0;try{if(skillIndex===null){const hit=calcDamage(session,skill,boss,{now,random});damage=Math.max(0,hit.dmg);}else{const hit=castSkill(session,boss,skill,{now,l2Target:target,random});damage=Math.max(0,hit.dealt||0);target.debuffs=boss.debuffs;setCooldown(skill,session,now);}}finally{clearShots(session);}
 p.nextAttackAt=now+weapon.interval;p.path=[];
 const dealt=Math.min(damage,target.hp);target.hp-=dealt;target.aggro=uid(session);
 if(target.main&&rule.kind==='damage')s.damage[cid(clan)]=(s.damage[cid(clan)]||0)+dealt;
 if(target.hp<=0){
  target.respawnAt=target.respawnMs?now+target.respawnMs:null;
   if(target.main&&rule.kind==='damage'){
   const winner=Object.entries(s.damage).sort((a,b)=>b[1]-a[1])[0]?.[0],r=s.registrations[winner];finish(record,h,s,r||null,now,records);
  }else if(rule.kind==='defenders'){
   defenderDefeated(record,h,s,target,now,records);
  }else if(target.role==='chest'){
   const roll=Math.floor(random()*100),index=roll<=5?0:Math.min(19,Math.floor((roll-1)/5)),letters=Object.values(rule.letterIds),bag=s.bags[uid(session)]||={};bag[letters[index]]=(bag[letters[index]]||0)+1;
  }
 }
 return {ok:true,damage:dealt};
}
export function hallConquestAction(record,h,session,clan,body,now=Date.now(),records=[],random=Math.random){
 if(!clan)return fail('not_in_clan');advanceHallContest(record,h,now,records,random);
 const s=record.siege,rule=hallScenario(h),id=cid(clan),user=uid(session);
 if(session.game.world?.mode==='siege'&&session.game.world.holding===h.id&&session.game.world.hallContestId!==s.id){leaveHolding(session,h,{force:true,now});return fail('siege_closed');}
 if(['siege_register','siege_unregister'].includes(body.action))return registration(record,h,session,clan,body,now,records);
 if(body.action==='siege_member'){
  if(s.phase!=='registration')return fail('siege_registration_closed');const r=s.registrations[id];if(!r)return fail('siege_not_registered');
  if(!atHoldingEntrance(session,h))return fail('holding_region_required');
  if(!r.members.includes(user)){if(r.members.length>=(rule.maxMembers||Infinity))return fail('hall_members_full');r.members.push(user);}return {ok:true};
 }
 if(body.action==='siege_defender'){
  const r=s.registrations[id];if(s.phase!=='registration'||String(clan.owner)!==user||!r)return fail('siege_registration_closed');
  const choice=Number(body.defenderId);if(!rule.defenders?.includes(choice))return fail('hall_defender_required');
  if(Object.values(s.registrations).some(r=>r.clanId!==id&&r.defenderId===choice))return fail('hall_defender_taken');r.defenderId=choice;return {ok:true};
 }
 if(body.action==='siege_enter'){
  if(session.game.gameClass.stats.hp<=0)return fail('dead');
  if(s.phase!=='battle'&&!(rule.kind==='rainbow'&&s.phase==='preparation'))return fail('siege_closed');
  if(rule.registrationRequired&&!s.registrations[id])return fail('siege_not_registered');
  if(ownedElsewhere(clan,h,records,now))return fail('hall_already_reserved');
  if(rule.kind==='defenders'&&!s.registrations[id]?.members.includes(user))return fail('hall_member_required');
  if(rule.kind==='rainbow'){
   const party=partyMembers(session.ownerDocument?.(),session);
   if(String(clan.owner)!==user||String(session.game.party?.leaderId)!==user||party.length<rule.minParty||party.some(m=>!clan.members.some(c=>String(c.userId)===uid(m))||!atHoldingEntrance(m,h)||m.game.gameClass?.stats?.hp<=0))return fail('hall_party_required');
   const admitted=s.accepted||Object.values(s.registrations).sort((a,b)=>(b.decrees||0)-(a.decrees||0)).slice(0,4).map(r=>r.clanId);
   if(!admitted.includes(id))return fail('hall_wrong_arena');
   const point=projection(rule,h)(rule.arenas[admitted.indexOf(id)]);
   for(const m of party){const result=enterHolding(m,h,'siege',now);if(!result.ok)return result;Object.assign(m.game.world,{hallContestId:s.id,x:point.x,y:point.y});m.game.effects=[];m.game.summons=[];m.needsSave=true;s.players[uid(m)]={name:playerName(m),x:point.x,y:point.y,path:[],moveAt:now,seenAt:now,hp:m.game.gameClass.stats.hp,clanId:id};}return {ok:true};
  }
  const entered=enterHolding(session,h,'siege',now);if(!entered.ok)return entered;
  session.game.world.hallContestId=s.id;
  s.registrations[id]||={...snapshot(clan),members:[],slot:Object.keys(s.registrations).length};s.players[user]={name:playerName(session),x:.5,y:.95,path:[],moveAt:now,seenAt:now,hp:session.game.gameClass.stats.hp,clanId:id};return {ok:true};
 }
 const w=session.game.world;
 if(w.mode!=='siege'||w.holding!==h.id||!s.players[user])return fail('not_in_siege');
 const p=updatePlayer(s,session,clan,now);
 if(s.settled){if(now>=s.cleanupAt)leaveHolding(session,h,{force:true,now});return fail('siege_closed');}
 if(session.game.gameClass.stats.hp<=0)return fail('dead');
 if(s.phase!=='battle'&&!['siege_move','siege_tick'].includes(body.action))return fail('siege_closed');
 npcCombat(s,session,clan,p,now,random);if(session.game.gameClass.stats.hp<=0)return fail('dead');
 if(body.action==='siege_move'){
  const block=l2ActionBlock(session,{move:true},now);if(block)return fail(block);
  const path=findPath(p,{x:Number(body.point?.x),y:Number(body.point?.y)});if(!path)return fail('path_blocked');p.path=path;p.moveAt=now;p.autoTarget=null;delete p.cast;return {ok:true};
 }
 if(body.action==='siege_capture')return fail('hall_scenario_objective');
 if(body.action==='siege_interrupt'){
  if(rule.kind==='rainbow')return fail('hall_peace_arena');
  const target=s.players[String(body.userId)],weapon=weaponSpatial(session,now),skill={...BASIC_ATTACK,cost:weapon.costMp||0};
  if(!target||target.clanId===id||target.hp<=0||target.seenAt<now-10000||!target.combat)return fail('pvp_invalid_target');
  if(!near(p,target,weapon.range))return fail('target_too_far');if(p.nextAttackAt>now)return fail('cooldown');
  if(usableSkill(session,skill,now))return fail('effect_blocked');
  const proxy={name:'siege-player',stats:{lvl:target.level},playerTarget:target.combat,hp:target.hp,currentHp:target.hp};
  payCost(session,'mp',weapon.costMp||0);spendAmmo(session,skill);armShots(session,skill);
  let damage;try{damage=Math.max(0,calcDamage(session,skill,proxy,{now,random}).dmg);}finally{clearShots(session);}
  target.pendingDamage=(target.pendingDamage||0)+damage;p.nextAttackAt=now+weapon.interval;return {ok:true,damage};
 }
 if(body.action==='siege_tick'&&p.cast?.until<=now){const cast=p.cast;return strike(record,h,session,clan,s.objectives.find(n=>n.id===cast.target),now,records,random,cast.index);}
 if(body.action==='siege_attack')return strike(record,h,session,clan,s.objectives.find(n=>n.id===body.target),now,records,random,body.skillIndex===undefined?null:Number(body.skillIndex));
 if(rule.kind==='rainbow')return rainbowAction(record,h,session,clan,body,now,records,random);
 return {ok:true};
}

function rainbowAction(record,h,session,clan,body,now,records,random){
 const s=record.siege,rule=hallScenario(h),index=s.accepted?.indexOf(cid(clan)),p=s.players[uid(session)],yeti=s.objectives.find(n=>n.role==='yeti'&&n.arena===index);
 if(index<0||!yeti)return fail('hall_wrong_arena');const bag=s.bags[uid(session)]||={};
 if(body.action==='siege_exchange'){
  if(String(clan.owner)!==uid(session))return fail('siege_leader_required');
  if(!near(p,yeti,60))return fail('target_too_far');if(s.wordIndex<0)return fail('hall_word_wait');
  const word=rule.words[s.wordIndex],needs={};for(const letter of word){const id=rule.letterIds[letter];needs[id]=(needs[id]||0)+1;}
  if(Object.entries(needs).some(([id,n])=>(bag[id]||0)<n))return fail('hall_letters_required');
  for(const [id,n] of Object.entries(needs))bag[id]-=n;
  const roll=random()*100,item=s.wordIndex<=5?(roll<70?8030:roll<80?8031:roll<90?8032:8033):(roll<10?8030:roll<40?8031:roll<70?8032:8033);bag[item]=(bag[item]||0)+1;return {ok:true,item};
 }
 if(body.action==='siege_trade_letter'){
  const other=s.players[String(body.userId)],item=Number(body.item),amount=Number(body.amount);
  if(!Object.values(rule.letterIds).includes(item)||!Number.isSafeInteger(amount)||amount<1||!other||other.clanId!==cid(clan)||other.seenAt<now-10000||!near(p,other)||(bag[item]||0)<amount)return fail('hall_trade_invalid');
  bag[item]-=amount;const target=s.bags[String(body.userId)]||={};target[item]=(target[item]||0)+amount;return {ok:true};
 }
 if(body.action==='siege_use_item'){
  const item=Number(body.item);if(!rule.itemIds.includes(item)||(bag[item]||0)<1)return fail('hall_item_required');
  if(!near(p,yeti,60))return fail('target_too_far');if((p.nextItemAt||0)>now)return fail('cooldown');
  const enemies=s.arenas.map((a,i)=>i).filter(i=>i!==index),enemy=enemies[Math.min(enemies.length-1,Math.floor(random()*enemies.length))];if(enemy===undefined)return fail('hall_wrong_arena');
  bag[item]--;p.nextItemAt=now+2000; // skills 2240–2243 reuseDelay
  const gourd=s.objectives.find(n=>n.role==='gourd'&&n.arena===(item===8030?index:enemy));
  if(item===8030){gourd.hp=Math.max(0,gourd.hp-1000);if(random()<.1)s.objectives.push(unit(rule.enragedYetiId,'enraged:'+now,{x:p.x+.005,y:p.y+.005},{arena:index,aggro:uid(session)}));if(gourd.hp===0)finish(record,h,s,s.registrations[cid(clan)],now,records);}
  if(item===8031)gourd.hp=Math.min(gourd.maxHp,gourd.hp+1000);
  if(item===8032){const own=s.objectives.find(n=>n.role==='gourd'&&n.arena===index);[own.x,gourd.x]=[gourd.x,own.x];[own.y,gourd.y]=[gourd.y,own.y];}
  if(item===8033)for(const peer of partyMembers(session.ownerDocument?.(),session))if(s.players[uid(peer)]?.clanId===s.arenas[enemy].clanId)applyL2Effect(session,peer,4991,1,{now,guaranteed:true});
  return {ok:true,item};
 }
 return {ok:true};
}
export function hallContestState(record,h,session,clan,now){
 const s=record?.siege,rule=hallScenario(h);if(!rule||s?.version!==2)return null;
 const p=s.players[uid(session)]||session.game.world,bag=s.bags[uid(session)]||{};
 const nodes=s.objectives.filter(n=>n.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)).slice(0,24).map(({id,npcId,name,x,y,hp,maxHp,clanId,role,arena,main})=>({id,npcId,name,x,y,hp,maxHp,clanId,role,arena,main}));
 return {registrationRequired:rule.registrationRequired,canManage:Boolean(clan&&String(clan.owner)===uid(session)),scenario:rule.kind,title:rule.title,phase:s.phase,round:s.round,resumeAt:s.resumeAt,registrationClosesAt:s.registrationClosesAt,startsAt:s.startsAt,endsAt:s.endsAt,settled:s.settled,winner:s.winner,word:rule.words?.[s.wordIndex]||null,nextWordAt:s.nextWordAt,bag,letterIds:rule.letterIds,items:rule.itemIds,registrationGold:rule.registrationGold,questItem:rule.questItem,minClanLevel:rule.minClanLevel,maxClans:rule.maxClans,maxMembers:rule.maxMembers,defenders:rule.defenders?.map(id=>({id,name:HALL_NPC_DEFS[id].name})),registrations:Object.values(s.registrations).map(r=>({clanId:r.clanId,name:r.name,memberCount:r.members.length,defenderId:r.defenderId,eliminated:r.eliminated})),mine:s.registrations[cid(clan)]||null,objectives:nodes,remaining:s.objectives.filter(n=>n.hp>0).length,player:s.players[uid(session)]||null};
}
