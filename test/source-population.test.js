import test from 'node:test';
import assert from 'node:assert/strict';
import {FIELD_POPULATIONS} from '../template/fieldPopulations.js';
import {populationSlots,initialPopulationSlots,randomPopulationRespawn} from '../functions/game/hunt/sourcePopulation.js';
import {enterHuntField,ensureHunt,advanceHunt,useHuntSkill,moveHuntField} from '../functions/game/hunt/huntFight.js';
import {getZone} from '../functions/game/hunt/huntMobs.js';
import {roomLayout,adjacent} from '../functions/game/hunt/huntRooms.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000,group='rune17_2017_45';
const data=FIELD_POPULATIONS['primeval-isle'],room=data.floors[0].rooms.find(r=>r.spawns.some(s=>s.randomGroup===group));
function hero(id='primeval-isle',targetMobId='22199'){
 const s={userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:85,currentExp:0},inventory:{gold:0,sp:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(s,'mage');updateStats(s);assert.ok(enterHuntField(s,id,{now:NOW,random:()=>0,targetMobId}).ok);quiet(s);s.testNow=NOW;
 const layout=roomLayout(getZone(id)),queue=[[s.game.hunt.field.room]],seen=new Set(queue[0]);
 while(queue.length){const path=queue.shift(),last=layout.rooms.find(r=>r.id===path.at(-1));if(last.id===room.id){for(const to of path.slice(1))walk(s,to);break;}for(const r of layout.rooms)if(!seen.has(r.id)&&adjacent(last,r)){seen.add(r.id);queue.push([...path,r.id]);}}
 return s;
}
function quiet(s){s.game.hunt.field.mobs.forEach(m=>{m.aggressive=false;m.aggro=false;m.nextAttackAt=NOW+1e12;});}
function walk(s,to){quiet(s);assert.ok(moveHuntField(s,'room:'+to,s.testNow).ok);s.testNow+=30000;advanceHunt(s,s.testNow,()=>0);quiet(s);assert.equal(s.game.hunt.field.room,to);}
test('Primeval random selection rolls an entry uniformly and spawns its entire quota',()=>{
 assert.equal(data.mobs.length,24);
 const choose=r=>initialPopulationSlots(room,null,null,()=>r).filter(s=>s.randomGroup===group);
 assert.deepEqual(choose(.49).map(s=>s.id),['22199','22199','22199']);
 assert.deepEqual(choose(.51).map(s=>s.id),['22223']);
 assert.equal(new Set(choose(0).map(s=>s.slot)).size,3);
});
test('a death rolls a new species and its delay; pending reservations count toward quota with no retry',()=>{
 const mobs=initialPopulationSlots(room,null,null,()=>0).filter(s=>s.randomGroup===group).map(s=>({sourceRoom:room.id,sourceSlot:s.slot,sourceRandomGroup:group,currentHp:1}));
 const first=mobs.shift(),field={mobs,rooms:{},respawns:[]};
 const event=randomPopulationRespawn(field,first,room,NOW,()=>.999999);
 assert.equal(populationSlots(room,null,null).find(s=>s.slot===event.sourceSlot).id,'22223');
 assert.equal(event.at,NOW+135000,'new entry 100s +/-35s, not dead entry 250s +/-55s');
 field.respawns.push(event);
 assert.equal(randomPopulationRespawn(field,mobs.shift(),room,NOW,()=>.999999),null,'full pending quota loses this roll');
});
test('real combat, save/load and room revisit retain the rolled population and pay the kill only once',()=>{
 const s=hero(),h=s.game.hunt,f=h.field,m=f.mobs.find(m=>m.sourceRandomGroup===group);assert.ok(m);
 const original=f.mobs.map(m=>m.instanceId);ensureHunt(s);assert.deepEqual(f.mobs.map(m=>m.instanceId),original);
 const layout=roomLayout(getZone('primeval-isle')),neighbor=layout.rooms.find(r=>adjacent(room,r));walk(s,neighbor.id);walk(s,room.id);
 assert.deepEqual(f.mobs.map(m=>m.instanceId),original,'revisit does not reroll the group');
 f.target=m.instanceId;h.mob=m;m.currentHp=1;f.x=m.x;f.y=m.y+.02;
 assert.ok(useHuntSkill(s,0,{now:s.testNow,random:()=>.5}).ok);advanceHunt(s,s.testNow+4000,()=>.5);assert.equal(h.kills,1);
 const replacement=f.respawns.find(r=>populationSlots(room,null,null).find(s=>s.slot===r.sourceSlot)?.id==='22223');assert.ok(replacement);
 const snapshot=JSON.parse(JSON.stringify(s));ensureHunt(snapshot);quiet(snapshot);
 assert.deepEqual(snapshot.game.hunt.field.mobs.map(m=>m.instanceId),f.mobs.map(m=>m.instanceId));
 const paid=JSON.stringify(snapshot.game.inventory);advanceHunt(snapshot,replacement.at,()=>.5);
 assert.equal(snapshot.game.hunt.kills,1);assert.equal(JSON.stringify(snapshot.game.inventory),paid);
 assert.ok(snapshot.game.hunt.field.mobs.some(m=>m.mobId==='22223'&&m.sourceRandomGroup===group));
 advanceHunt(snapshot,replacement.at+1,()=>.5);assert.equal(snapshot.game.hunt.kills,1);
});
