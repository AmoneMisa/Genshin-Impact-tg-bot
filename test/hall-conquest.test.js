import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {HALL_SCENARIOS,HALL_NPC_DEFS} from '../template/hallScenarios.js';
import holdings from '../template/worldHoldings.js';
import {ensureHallContest,advanceHallContest,hallConquestAction,hallContestState,nextHallRegistration,gameHour} from '../functions/game/world/hallConquest.js';
import {arriveHoldingEntrance} from '../functions/game/world/holdingEntry.js';
import {hallAction,hallState} from '../functions/game/world/hall.js';
import {hallSceneUrl} from '../webapp/hall-location.js';
import {atlasObjects} from '../webapp/atlas-objects.js';
import {hallContestHtml,hallObjectiveHtml} from '../webapp/hall-conquest-view.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
const NOW=Date.now();
function hero(id=1){const s={userId:id,userChatData:{user:{id}},game:{stats:{lvl:80,currentExp:0},inventory:{gold:1e7,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{}}};change(s,'humanFighter');update(s);s.game.gameClass.stats.hp=1e6;s.game.world={city:'giran',mode:'city',x:.5,y:.5,path:[],moveAt:NOW,locks:{}};return s;}
function clan(id='a',owner=1){return {_id:id,owner,name:'Clan '+id,level:5,members:[{userId:owner}],hall:{level:1},warehouse:{gold:1e8}};}
function setup(id){const h=holdings.find(h=>h.id==='hall:'+id),r={_id:h.id},s=ensureHallContest(r,h,NOW);return {h,r,s,records:[r]};}
function at(s,h){arriveHoldingEntrance(s,h,NOW);}
function start(f,time=NOW+1000){f.s.registrationClosesAt=time-1;f.s.startsAt=time;f.s.endsAt=time+3600000;advanceHallContest(f.r,f.h,time,f.records,()=>0);return time;}
function action(f,p,c,body,now=NOW){return hallConquestAction(f.r,f.h,p,c,body,now,f.records,()=>0);}
function stand(f,p,node){Object.assign(f.s.players[String(p.userId)],{x:node.x,y:node.y,path:[]});Object.assign(p.game.world,{x:node.x,y:node.y});}
test('six original scenarios, NPC HP passives, calendars, and bounded versioned pictures are published',()=>{
 assert.equal(Object.keys(HALL_SCENARIOS).length,6);assert.equal(HALL_NPC_DEFS[35375].hp,4600000);
 for(const rule of Object.values(HALL_SCENARIOS)){
  assert.deepEqual(rule.schedule,[14,0,0,12,0]);assert.equal(rule.durationMs,3600000);assert.ok(rule.source&&rule.sha256.length===64);
  const date=new Date(nextHallRegistration(rule,NOW));assert.equal(date.getHours(),12);assert.equal(date.getMinutes(),0);
  const h=holdings.find(h=>h.id===rule.id);
  for(const compact of [false,true]){const file=new URL('../webapp'+hallSceneUrl(h,{room:'courtyard',compact}),import.meta.url);assert.ok(fs.statSync(file).size<(compact?180000:800000));}
 }
 for(let level=1;level<=5;level++)for(const compact of [true,false])assert.ok(fs.existsSync(new URL('../webapp'+hallSceneUrl(null,{level,compact}),import.meta.url)));
 assert.equal(new Set(Array.from({length:5},(_,i)=>hallSceneUrl(null,{level:i+1}))).size,5);
 assert.equal(atlasObjects({holdings,cities:[]},'contestable-halls','',true).length,6);
});
test('raid halls use clan damage, not the last hit or a channel, and enforce source registration differences',()=>{
 for(const id of [21,34,64]){
  const f=setup(id),a=hero(),b=hero(2),ca=clan(),cb=clan('b',2);at(a,f.h);at(b,f.h);
  if(id!==21){assert.equal(action(f,a,ca,{action:'siege_register'}).ok,true);assert.equal(action(f,b,cb,{action:'siege_register'}).ok,true);}
  let time=NOW+1000;if(id===64&&gameHour(time)>6)time+=((24-gameHour(time))*600000);
  start(f,time);assert.equal(action(f,a,ca,{action:'siege_enter'},time).ok,true);assert.equal(action(f,b,cb,{action:'siege_enter'},time).ok,true);
  assert.equal(f.s.objectives.filter(n=>n.main).length,1);const target=f.s.objectives.find(n=>n.main);assert.equal(target.npcId,HALL_SCENARIOS[f.h.id].bossId);f.s.damage.a=1e9;target.hp=1;stand(f,b,target);
  assert.equal(action(f,b,cb,{action:'siege_capture'},time).reason,'hall_scenario_objective');
  const hit=action(f,b,cb,{action:'siege_attack',target:target.id},time);assert.equal(hit.ok,true);assert.equal(f.r.owner.clanId,'a');assert.equal(f.s.settled,true);assert.equal(Object.keys(f.s.rewarded).length,0,'no invented fame or epaulets');
  advanceHallContest(f.r,f.h,time+1,f.records);assert.equal(f.r.siege.phase,'registration');assert.ok(f.r.siege.registrationClosesAt>time);
 }
});
test('raid timeout never awards the largest damage without a kill; corpse and forged arrival do not enter',()=>{
 const f=setup(34),p=hero(),c=clan();at(p,f.h);assert.equal(action(f,p,c,{action:'siege_register'}).ok,true);const time=start(f);
 p.game.world.mode='city';p.game.world.x=.5;p.game.world.y=.5;p.game.world.readyHolding=f.h.id;
 assert.equal(action(f,p,c,{action:'siege_enter'},time).reason,'holding_region_required');at(p,f.h);p.game.gameClass.stats.hp=0;assert.equal(action(f,p,c,{action:'siege_enter'},time).reason,'dead');
 f.s.damage.a=999999;advanceHallContest(f.r,f.h,f.s.endsAt,f.records);assert.equal(f.r.owner,null);assert.equal(f.s.phase,'draw');
});
test('both defender contests validate payment, unique NPCs, 18 players and the owner final after five minutes',()=>{
 for(const id of [35,63]){
  const f=setup(id),a=hero(),b=hero(2),ca=clan(),cb=clan('b',2),rule=HALL_SCENARIOS[f.h.id];f.r.owner={clanId:'owner',name:'Owner',leaderId:'99',defenderId:rule.defenders[4]};
  at(a,f.h);at(b,f.h);const gold=a.game.inventory.gold;
  assert.equal(action(f,a,ca,{action:'siege_register',defenderId:1}).reason,'hall_defender_required');assert.equal(a.game.inventory.gold,gold);
  assert.equal(action(f,a,ca,{action:'siege_register',defenderId:rule.defenders[0]}).ok,true);assert.equal(a.game.inventory.gold,gold-200000);
  assert.equal(action(f,b,cb,{action:'siege_register',defenderId:rule.defenders[0]}).reason,'hall_defender_taken');
  b.game.inventory.materials['l2_'+rule.questItem]=1;assert.equal(action(f,b,cb,{action:'siege_register',defenderId:rule.defenders[1],payment:'quest'}).ok,true);assert.equal(b.game.inventory.materials['l2_'+rule.questItem],0);
  f.s.registrations.a.members=Array.from({length:18},(_,i)=>String(i+100));assert.equal(action(f,a,ca,{action:'siege_member'}).reason,'hall_members_full');f.s.registrations.a.members=['1'];
  const time=start(f);assert.equal(action(f,a,ca,{action:'siege_enter'},time).ok,true);let target=f.s.objectives.find(n=>n.clanId==='b');target.hp=1;stand(f,a,target);
  assert.equal(action(f,a,ca,{action:'siege_attack',target:target.id},time).ok,true);assert.equal(f.s.round,'pause');assert.equal(f.r.owner,null);
  advanceHallContest(f.r,f.h,time+300000,f.records);assert.equal(f.s.round,'final');target=f.s.objectives.find(n=>n.clanId==='owner');target.hp=1;stand(f,a,target);
  assert.equal(action(f,a,ca,{action:'siege_attack',target:target.id},time+300000).ok,true);assert.equal(f.r.owner.clanId,'a');
 }
});
function party(c,h,startId){const members=Array.from({length:5},(_,i)=>hero(startId+i)),chat={members};c.owner=startId;c.members=members.map(m=>({userId:m.userId}));for(const m of members){m.ownerDocument=()=>chat;m.game.party={id:'p'+startId,leaderId:String(startId)};at(m,h);}return members;}
test('withdrawing a defender registration frees its own position without overlapping remaining clans',()=>{
 const f=setup(35),rule=HALL_SCENARIOS[f.h.id],a=hero(),b=hero(2),c=hero(3),ca=clan(),cb=clan('b',2),cc=clan('c',3);
 for(const p of [a,b,c])at(p,f.h);
 assert.equal(action(f,a,ca,{action:'siege_register',defenderId:rule.defenders[0]}).ok,true);
 assert.equal(action(f,b,cb,{action:'siege_register',defenderId:rule.defenders[1]}).ok,true);
 assert.equal(action(f,a,ca,{action:'siege_unregister'}).ok,true);
 assert.equal(action(f,c,cc,{action:'siege_register',defenderId:rule.defenders[2]}).ok,true);
 assert.equal(f.s.registrations.b.slot,1);assert.equal(f.s.registrations.c.slot,0);
 start(f);assert.equal(new Set(f.s.objectives.map(n=>`${n.x}:${n.y}`)).size,2);
});
test('Rainbow requires decrees, supports half refunds and a living clan party, then exchanges letters and wins by nectar',()=>{
 const f=setup(62),ca=clan(),cb=clan('b',10),aa=party(ca,f.h,1),bb=party(cb,f.h,10),a=aa[0],b=bb[0];
 assert.equal(action(f,a,ca,{action:'siege_register'}).reason,'hall_decree_required');a.game.inventory.materials.l2_8034=11;b.game.inventory.materials.l2_8034=20;
 assert.equal(action(f,a,ca,{action:'siege_register'}).ok,true);assert.equal(action(f,a,ca,{action:'siege_unregister'}).ok,true);assert.equal(a.game.inventory.materials.l2_8034,5);
 assert.equal(action(f,a,ca,{action:'siege_register'}).ok,true);assert.equal(action(f,b,cb,{action:'siege_register'}).ok,true);
 const time=start(f);aa[1].game.gameClass.stats.hp=0;assert.equal(action(f,a,ca,{action:'siege_enter'},time).reason,'hall_party_required');aa[1].game.gameClass.stats.hp=1e6;
 assert.equal(action(f,a,ca,{action:'siege_enter'},time).ok,true);assert.ok(aa.every(m=>m.game.world.mode==='siege'&&m.game.effects.length===0));
 advanceHallContest(f.r,f.h,time+10000,f.records,()=>0);assert.equal(f.s.wordIndex,0);
 const index=f.s.accepted.indexOf('a'),yeti=f.s.objectives.find(n=>n.role==='yeti'&&n.arena===index),gourd=f.s.objectives.find(n=>n.role==='gourd'&&n.arena===index);stand(f,a,yeti);
 assert.equal(action(f,a,ca,{action:'siege_exchange'},time+10000).reason,'hall_letters_required');
 f.s.bags['1']={};for(const ch of HALL_SCENARIOS[f.h.id].words[0]){const id=HALL_SCENARIOS[f.h.id].letterIds[ch];f.s.bags['1'][id]=(f.s.bags['1'][id]||0)+1;}
 assert.equal(action(f,a,ca,{action:'siege_exchange'},time+10000).item,8030);gourd.hp=1000;
 assert.equal(action(f,a,ca,{action:'siege_use_item',item:8030},time+10000).ok,true);assert.equal(f.r.owner.clanId,'a');assert.equal(f.s.cleanupAt,time+130000);
 assert.equal(hallContestState(f.r,f.h,a,ca,time).bag[8030],0);
});
test('captured halls have a courtyard, a walkable interior and server-checked persistent development',()=>{
 const f=setup(35),p=hero(),c=clan();f.r.owner={clanId:'a'};at(p,f.h);
 assert.equal(hallAction(p,c,f.h,f.r,{action:'hall_enter'},NOW).ok,true);assert.equal(hallState(p,c,f.h,f.r,NOW).room,'courtyard');
 assert.equal(hallAction(p,c,f.h,f.r,{action:'hall_room'},NOW).reason,'entrance_required');p.game.world.y=.1;
 assert.equal(hallAction(p,c,f.h,f.r,{action:'hall_room'},NOW).ok,true);assert.equal(p.game.world.hallRoom,'interior');
 assert.equal(hallAction(p,c,f.h,f.r,{action:'hall_leave'},NOW).reason,'hall_courtyard_required');
 c.hall.glory=40000;const before=c.warehouse.gold;assert.equal(hallAction(p,c,f.h,f.r,{action:'hall_upgrade'},NOW).ok,true);assert.equal(c.hall.level,2);assert.equal(c.warehouse.gold,before-300000);
 const dto=hallState(p,c,f.h,f.r,NOW);assert.equal(dto.level,2);assert.match(hallSceneUrl(f.h,{level:dto.level}),/hall-level-2/);
 assert.equal(hallAction(p,{...c,owner:99,members:[]},f.h,f.r,{action:'hall_upgrade'},NOW).reason,'not_allowed');
 assert.ok(hallContestHtml({...hallContestState(f.r,f.h,p,c,NOW),phase:'registration'}).includes('data-conquest-defender'));
 assert.ok(hallObjectiveHtml({name:'Yeti',role:'yeti',hp:1,maxHp:1},{bag:{},items:[]}).includes('siege_exchange'));
});
