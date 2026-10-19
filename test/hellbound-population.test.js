import test from 'node:test';
import assert from 'node:assert/strict';
import {FIELD_POPULATIONS} from '../template/fieldPopulations.js';
import {populationSlots,populationCapacity,hellboundStage} from '../functions/game/hunt/sourcePopulation.js';
import {enterHuntField,ensureHunt,advanceHunt,useHuntSkill} from '../functions/game/hunt/huntFight.js';
import {getHuntState} from '../miniapp/hunt.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000,data=FIELD_POPULATIONS.hellbound,rooms=data.floors[0].rooms;
function hero(stage=1){
 const chat={game:{hellbound:{level:stage}}};
 const s={userId:1,userChatData:{user:{id:1}},ownerDocument:()=>chat,game:{stats:{lvl:85,currentExp:0},inventory:{gold:0,sp:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(s,'mage');updateStats(s);assert.ok(enterHuntField(s,'hellbound',{now:NOW,random:()=>.5}).ok);
 s.game.world={mode:'location',location:'hellbound'};quiet(s);return {s,chat};
}
function quiet(s){s.game.hunt.field.mobs.forEach(m=>{m.aggressive=false;m.aggroRange=0;m.aggro=false;m.nextAttackAt=NOW+1e12;});}
test('Hellbound imports the island script, native stage conditions and stable slots, including closed stage zero',()=>{
 assert.equal(data.mobs.length,35);assert.ok(data.source.files['scripts/ai/areas/Hellbound/hellboundSpawns.xml']);
 const counts=[];
 for(let stage=0;stage<=11;stage++){
  const {s}=hero(stage);counts.push(rooms.reduce((n,r)=>n+populationSlots(r,s,'hellbound').length,0));
  for(const r of rooms){const slots=populationSlots(r,s,'hellbound');assert.equal(populationCapacity(r,s,'hellbound'),slots.length);assert.equal(new Set(slots.map(p=>p.slot)).size,slots.length);}
 }
 assert.deepEqual(counts,[0,222,237,238,239,249,242,275,275,286,344,344]);
 const {s}=hero(0);assert.equal(s.game.hunt.field.mobs.length,0);
 s.game.hellbound={level:11};s.game.world.hellboundLevel=11;s.game.hunt.field.populationStage=11;
 assert.equal(hellboundStage(s),0);ensureHunt(s,NOW);assert.equal(s.game.hunt.field.mobs.length,0,'client/member state cannot open the island');
});
test('unchanged stage preserves damage and pending reservations across serialization; a stage change restores only active actors without rewards',()=>{
 const {s,chat}=hero(1),h=s.game.hunt,f=h.field,m=f.mobs[0];m.currentHp=1;
 f.rooms[rooms[1].id]={mobs:[]};f.respawns=[{room:rooms[1].id,sourceSlot:0,at:NOW+50000}];
 ensureHunt(s,NOW);assert.equal(m.currentHp,1);assert.equal(f.respawns.length,1);assert.equal(f.rooms[rooms[1].id].mobs.length,0);
 const saved=JSON.parse(JSON.stringify({s,chat}));saved.s.ownerDocument=()=>saved.chat;ensureHunt(saved.s,NOW);
 assert.equal(saved.s.game.hunt.field.mobs[0].currentHp,1);assert.equal(saved.s.game.hunt.field.respawns.length,1);
 const before=JSON.stringify(s.game.inventory),kills=h.kills;chat.game.hellbound.level=4;ensureHunt(s,NOW+1000);
 assert.equal(f.populationStage,4);assert.equal(f.respawns.length,0);assert.equal(h.kills,kills);assert.equal(JSON.stringify(s.game.inventory),before);
 for(const [id,actors] of [[f.room,f.mobs],...Object.entries(f.rooms).map(([id,r])=>[id,r.mobs])]){
  const expected=populationSlots(rooms.find(r=>r.id===id),s,'hellbound');assert.deepEqual(actors.map(a=>a.sourceSlot),expected.map(p=>p.slot));
  assert.ok(actors.every(a=>a.currentHp===a.hp));
 }
 const surviving=f.mobs.find(a=>a.sourceSlot===m.sourceSlot);if(surviving)assert.equal(surviving.instanceId,m.instanceId);
 quiet(s);advanceHunt(s,NOW+50000,()=>.5);assert.equal(f.respawns.length,0);
 chat.game.hellbound.level=0;ensureHunt(s,NOW+60000);assert.equal(f.mobs.length,0);assert.ok(Object.values(f.rooms).every(r=>r.mobs.length===0));
});
test('Hellbound DTO reports stage capacity and locked state from the server',async()=>{
 for(const stage of [0,1,4,11]){
  const {s}=hero(stage),dto=(await getHuntState(s,NOW)).field;
  assert.deepEqual(dto.phase,{stage,locked:stage===0});assert.equal(dto.room.cap,populationCapacity(rooms[0],s,'hellbound'));
  assert.ok(dto.map.rooms.every(r=>r.cap===populationCapacity(rooms.find(p=>p.id===r.id),s,'hellbound')));
 }
});
test('a native Hellbound kill reserves the same source slot and cannot return after the island closes',()=>{
 const {s,chat}=hero(1),h=s.game.hunt,f=h.field,m=f.mobs[0];m.currentHp=1;f.target=m.instanceId;h.mob=m;f.x=m.x;f.y=m.y+.02;
 assert.ok(useHuntSkill(s,0,{now:NOW,random:()=>.5}).ok);advanceHunt(s,NOW+4000,()=>.5);assert.equal(h.kills,1);
 const pending=f.respawns.find(r=>r.sourceSlot===m.sourceSlot);assert.ok(pending);assert.equal(pending.room,m.sourceRoom);
 chat.game.hellbound.level=0;ensureHunt(s,NOW+5000);advanceHunt(s,pending.at+1,()=>.5);
 assert.equal(f.mobs.length,0);assert.equal(f.respawns.length,0);assert.equal(h.kills,1);
});
test('rewardless native actors still respawn with their source delay and grant no inventory or experience',()=>{
 const {s}=hero(6),h=s.game.hunt,f=h.field,m=f.mobs.find(m=>m.mobId==='18484');assert.ok(m?.rewardless);
 m.currentHp=1;f.target=m.instanceId;h.mob=m;f.x=m.x;f.y=m.y+.02;
 const before=JSON.stringify(s.game.inventory),exp=s.game.stats.currentExp;
 assert.ok(useHuntSkill(s,0,{now:NOW,random:()=>.5}).ok);advanceHunt(s,NOW+4000,()=>.5);
 assert.equal(h.kills,1);assert.equal(JSON.stringify(s.game.inventory),before);assert.equal(s.game.stats.currentExp,exp);
 const pending=f.respawns.find(r=>r.sourceSlot===m.sourceSlot);assert.ok(pending);assert.ok(pending.at>=NOW+150000&&pending.at<=NOW+454000);
 quiet(s);advanceHunt(s,pending.at,()=>.5);assert.ok(f.mobs.some(a=>a.sourceSlot===m.sourceSlot&&a.mobId===m.mobId));
 assert.equal(h.kills,1);assert.equal(JSON.stringify(s.game.inventory),before);
});
