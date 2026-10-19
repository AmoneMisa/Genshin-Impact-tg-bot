import test from 'node:test';
import assert from 'node:assert/strict';
import {enterHuntField,ensureHunt,advanceHunt,useHuntSkill,selectHuntTarget,moveHuntField,setHuntAttack} from '../functions/game/hunt/huntFight.js';
import {battleField,battleActor,actorEntries,firstBoundary,neighborhood} from '../functions/game/hunt/huntNeighborhood.js';
import {roomLayout} from '../functions/game/hunt/huntRooms.js';
import {getZone} from '../functions/game/hunt/huntMobs.js';
import {aggroNearby,provokeMob,pursuePlayer} from '../functions/game/hunt/huntAi.js';
import {inSkillReach,skillSpatial,spatialTargets} from '../functions/game/hunt/huntSpatial.js';
import {getHuntState} from '../miniapp/hunt.js';
import {visibleFieldMobs} from '../webapp/hunt-visible-actors.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000;
function hero(){
 const s={userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:85,currentExp:0},inventory:{gold:0,sp:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(s,'mage');updateStats(s);assert.ok(enterHuntField(s,'cruma-marshlands',{now:NOW,random:()=>.5}).ok);s.game.world={mode:'location',location:'cruma-marshlands'};
 ensureHunt(s,NOW,()=>.5);quiet(s);Object.assign(s.game.hunt.field,{x:.96,y:.6});return s;
}
function quiet(s){for(const {mob} of actorEntries(s.game.hunt)){mob.aggressive=false;mob.aggroRange=0;mob.aggro=false;mob.nextAttackAt=NOW+1e12;}}
function neighbour(s){const mob=s.game.hunt.field.rooms.r0c1.mobs[0];assert.ok(mob);Object.assign(mob,{x:.04,y:.6});return mob;}
function withWalls(walls,fn){const room=roomLayout(getZone('cruma-marshlands')).rooms.find(r=>r.id==='r0c1'),saved=room.walls;try{room.walls=walls;return fn();}finally{room.walls=saved;}}

test('neighbour views translate position while HP, effects and reward state mutate only the canonical bank actor',async()=>{
 const s=hero(),m=neighbour(s),h=s.game.hunt,view=battleActor(h,m.instanceId);
 assert.ok(Math.abs(view.x-1.04)<1e-12);view.currentHp=17;view.debuffs=[{kind:'test'}];assert.equal(m.currentHp,17);assert.equal(m.x,.04);
 const dto=(await getHuntState(s,NOW)).field;assert.ok(dto.mobs.some(a=>a.instanceId===m.instanceId&&a.x>1));assert.ok(dto.mobs.length<=48);
 assert.ok(visibleFieldMobs(dto,8).length<=8);assert.ok(visibleFieldMobs(dto,16).length<=16);
 const saved=JSON.parse(JSON.stringify(s));ensureHunt(saved,NOW);assert.equal(saved.game.hunt.field.rooms.r0c1.mobs.find(a=>a.instanceId===m.instanceId).x,.04);
 assert.equal(battleActor(saved.game.hunt,m.instanceId).currentHp,17);
 assert.equal(new Set(actorEntries(saved.game.hunt).map(a=>a.mob.instanceId)).size,actorEntries(saved.game.hunt).length);
});

test('a ranged kill across a boundary removes its canonical actor, pays once and respawns at its original source slot after save/load',()=>{
 const s=hero(),m=neighbour(s),h=s.game.hunt,f=h.field;const slot=m.sourceSlot;m.currentHp=1;
 assert.ok(selectHuntTarget(s,m.instanceId,NOW).ok);assert.equal(m.aggro,false,'selection stays peaceful');
 assert.ok(useHuntSkill(s,0,{now:NOW,random:()=>.5}).ok);advanceHunt(s,NOW+4000,()=>.5);
 assert.equal(h.kills,1);assert.equal(battleActor(h,m.instanceId),null);assert.ok(!f.rooms.r0c1.mobs.some(a=>a.instanceId===m.instanceId));
 const pending=f.respawns.find(r=>r.room==='r0c1'&&r.sourceSlot===slot);assert.ok(pending);
 const saved=JSON.parse(JSON.stringify(s)),paid=JSON.stringify(saved.game.inventory);ensureHunt(saved,NOW+4000);quiet(saved);
 advanceHunt(saved,pending.at,()=>.5);assert.equal(saved.game.hunt.kills,1);assert.equal(JSON.stringify(saved.game.inventory),paid);
 assert.equal(saved.game.hunt.field.rooms.r0c1.mobs.filter(a=>a.sourceSlot===slot).length,1);
 advanceHunt(saved,pending.at+1,()=>.5);assert.equal(saved.game.hunt.field.rooms.r0c1.mobs.filter(a=>a.sourceSlot===slot).length,1);
});

test('both cells contribute line-of-sight walls and a blocked cast cannot spend resources or deal damage',()=>{
 const s=hero(),m=neighbour(s),h=s.game.hunt,skill=s.game.gameClass.skills[0],geometry=skillSpatial(s,skill,NOW);
 const barrier=[{x:0,y:.2,w:.02,h:.7}];
 withWalls(barrier,()=>{
  assert.equal(inSkillReach(battleField(h),battleActor(h,m.instanceId),geometry),false);
  assert.ok(selectHuntTarget(s,m.instanceId,NOW).ok);const hp=m.currentHp,mp=s.game.gameClass.stats.mp;
  useHuntSkill(s,0,{now:NOW,random:()=>.5});advanceHunt(s,NOW+4000,()=>.5);
  assert.equal(m.currentHp,hp);assert.equal(s.game.gameClass.stats.mp,mp);assert.equal(h.kills,0);
 });
});

test('line of sight is rechecked at cast completion, and a neighbour can retaliate only through an unobstructed line',()=>{
 const s=hero(),m=neighbour(s),h=s.game.hunt;
 assert.ok(selectHuntTarget(s,m.instanceId,NOW).ok);assert.ok(useHuntSkill(s,0,{now:NOW,random:()=>.5}).ok);
 assert.equal(h.field.action.phase,'cast');const hp=m.currentHp,mp=s.game.gameClass.stats.mp;
 withWalls([{x:0,y:.2,w:.02,h:.7}],()=>advanceHunt(s,NOW+4000,()=>.5));
 assert.equal(m.currentHp,hp);assert.equal(s.game.gameClass.stats.mp,mp);assert.equal(h.field.action,undefined);
 Object.assign(m,{aggro:true,ai:'fighter',nextAbilityAt:NOW+1e12,nextAttackAt:NOW+5000,lastMoveAt:NOW+5000});
 const heroHp=s.game.gameClass.stats.hp;
 withWalls([{x:0,y:.2,w:.02,h:.7}],()=>advanceHunt(s,NOW+5000,()=>.99));assert.equal(s.game.gameClass.stats.hp,heroHp);
 m.nextAttackAt=NOW+6000;advanceHunt(s,NOW+6000,()=>.99);assert.ok(s.game.gameClass.stats.hp<heroHp);
});

test('aggression and social assistance cross the boundary only within their native radius and line of sight',()=>{
 const s=hero(),h=s.game.hunt,m=neighbour(s),local=h.field.mobs[0];Object.assign(local,{x:.95,y:.6});
 Object.assign(m,{aggressive:true,aggroRange:200});aggroNearby(h,NOW,s);assert.equal(m.aggro,true);
 m.aggro=false;withWalls([{x:0,y:.2,w:.02,h:.7}],()=>{aggroNearby(h,NOW,s);assert.equal(m.aggro,false);});
 Object.assign(m,{aggressive:false,clanHelpRange:300,socialClans:['test'],socialIgnoredIds:[]});local.socialClans=['test'];
 provokeMob(h,local,NOW);assert.equal(m.aggro,true);
 m.aggro=false;m.clanHelpRange=10;provokeMob(h,local,NOW);assert.equal(m.aggro,false);
});

test('pursuit transfers one canonical actor at its actual edge position without copying it into the player cell',()=>{
 const s=hero(),h=s.game.hunt,f=h.field,m=neighbour(s);Object.assign(f,{x:.7,y:.6});Object.assign(m,{x:.02,y:.6,aggro:true,ai:'fighter',lastMoveAt:NOW});
 const id=m.instanceId,source=m.sourceRoom;const before=1+m.x;
 pursuePlayer(h,NOW+1000);
 assert.ok(f.mobs.includes(m));assert.ok(!f.rooms.r0c1.mobs.includes(m));assert.equal(m.instanceId,id);assert.equal(m.sourceRoom,source);
 assert.ok(m.x<1&&m.x>.9);assert.ok(Math.abs(m.y-.6)<.04);assert.ok(before-m.x<=.09+1e-9);
 assert.equal(actorEntries(h).filter(a=>a.mob.instanceId===id).length,1);
});

test('AOE includes nearby actors across cells, respects the shared wall map and mutates their real HP',()=>{
 const s=hero(),h=s.game.hunt,m=neighbour(s),local=h.field.mobs[0];Object.assign(local,{x:.95,y:.6});
 const geometry={target:'AURA',radius:250,limit:0},targets=spatialTargets(battleField(h),null,geometry,()=>.5);
 assert.ok(targets.some(t=>t.instanceId===m.instanceId));assert.ok(targets.includes(local));
 const hp=m.currentHp;targets.find(t=>t.instanceId===m.instanceId).currentHp-=1;assert.equal(m.currentHp,hp-1);
 withWalls([{x:0,y:.2,w:.02,h:.7}],()=>assert.ok(!spatialTargets(battleField(h),null,geometry).some(t=>t.instanceId===m.instanceId)));
});

test('native pole geometry kills on both sides with one action charge and one reward per actor',()=>{
 const s=hero();changeClass(s,'humanFighter');updateStats(s);
 s.game.equipmentStats.rhand={name:'Short Spear',mainType:'weapon',kind:'pole',grade:'noGrade',isFilled:true,characteristics:{}};
 const h=s.game.hunt,f=h.field,a=f.mobs[0],b=neighbour(s);Object.assign(f,{x:.99,y:.6});
 Object.assign(a,{x:.998,y:.6,currentHp:1});Object.assign(b,{x:.01,y:.6,currentHp:1});
 s.game.effects.push({name:'addDamageToBoss',amount:10,count:2});
 assert.ok(selectHuntTarget(s,b.instanceId,NOW).ok);assert.ok(setHuntAttack(s,true,NOW).ok);
 assert.equal(h.kills,2);assert.equal(battleActor(h,a.instanceId),null);assert.equal(battleActor(h,b.instanceId),null);
 assert.equal(s.game.effects.find(e=>e.name==='addDamageToBoss').count,1);
 assert.equal(f.respawns.filter(r=>r.room===a.sourceRoom&&r.sourceSlot===a.sourceSlot||r.room===b.sourceRoom&&r.sourceSlot===b.sourceSlot).length,2);
 const paid=JSON.stringify(s.game.inventory);advanceHunt(s,NOW,()=>.5);assert.equal(h.kills,2);assert.equal(JSON.stringify(s.game.inventory),paid);
});

test('melee approach retains target and combat intention across walking; a normal walk does not teleport pursuers',()=>{
 const s=hero();changeClass(s,'humanFighter');updateStats(s);const h=s.game.hunt,f=h.field,m=neighbour(s);Object.assign(m,{x:.25,y:.6,currentHp:1});
 assert.ok(selectHuntTarget(s,m.instanceId,NOW).ok);assert.ok(setHuntAttack(s,true,NOW).ok);assert.ok(f.crossing?.combat);
 for(let elapsed=500;elapsed<=12000&&h.kills===0;elapsed+=500){f.seenAt=NOW+elapsed;quiet(s);advanceHunt(s,NOW+elapsed,()=>.5);}
 assert.equal(f.room,'r0c1');assert.equal(h.kills,1);assert.equal(battleActor(h,m.instanceId),null);
 const other=hero(),a=neighbour(other),origin={x:a.x,y:a.y};a.aggro=true;
 assert.ok(moveHuntField(other,{x:1.1,y:.6},NOW).ok);assert.deepEqual({x:a.x,y:a.y},origin,'issuing a move cannot relocate a pursuing actor');
});

test('leaving the resident window clears distant aggression and returning cannot replay accumulated attacks',()=>{
 const s=hero(),h=s.game.hunt,f=h.field,m=f.mobs[0],id=m.instanceId;m.currentHp=1;
 assert.ok(moveHuntField(s,'room:r0c1',NOW).ok);advanceHunt(s,NOW+30000,()=>.5);quiet(s);
 Object.assign(m,{aggro:true,lastMoveAt:NOW+1e12,nextAttackAt:NOW-1});
 assert.ok(moveHuntField(s,'room:r0c2',NOW+30001).ok);advanceHunt(s,NOW+60001,()=>.5);
 assert.equal(f.room,'r0c2');assert.equal(f.rooms.r0c0.mobs.find(a=>a.instanceId===id),m);
 assert.equal(m.aggro,false);assert.equal(battleActor(h,id),null);assert.equal(selectHuntTarget(s,id,NOW+60002).reason,'no_mob');
 assert.ok(moveHuntField(s,'room:r0c1',NOW+60003).ok);advanceHunt(s,NOW+90003,()=>.5);
 assert.ok(battleActor(h,id));assert.equal(m.currentHp,1);assert.ok(m.nextAttackAt>=NOW+90003+m.attackMs);
});

test('firstBoundary picks the nearest cardinal edge, handles a start exactly on an edge and a diagonal exit',()=>{
 const east=firstBoundary({x:.5,y:.5},{x:1.5,y:.5});assert.deepEqual([east.dx,east.dy,east.exit.x,east.exit.y],[1,0,1,.5]);assert.deepEqual(east.entry,{x:0,y:.5});
 const onEdge=firstBoundary({x:1,y:.5},{x:1.2,y:.5});assert.equal(onEdge.t,0);assert.equal(onEdge.dx,1);
 const diagonal=firstBoundary({x:.9,y:.5},{x:1.3,y:-.5});assert.equal(diagonal.dx,1,'the x edge is reached first');assert.equal(diagonal.dy,0);
 assert.equal(firstBoundary({x:.2,y:.2},{x:.8,y:.8}),null);
});

test('moving out of the window drops aggression and moving back replays no accumulated attacks',()=>{
 const s=hero(),h=s.game.hunt,f=h.field,m=neighbour(s);m.aggro=true;m.nextAttackAt=NOW-5000;
 assert.ok(neighborhood(h));assert.ok(f.residentRooms.includes('r0c1'));
 // Re-entering after leaving: the actor starts with a fresh clock.
 f.residentRooms=f.residentRooms.filter(id=>id!=='r0c1');ensureHunt(s,NOW+60000,()=>.5);
 assert.ok(f.rooms.r0c1.mobs.every(a=>a.nextAttackAt>=NOW+60000));assert.ok(f.residentRooms.includes('r0c1'));
});

function ambush(s,count){
 const f=s.game.hunt.field,own=f.mobs.slice(0,count/2),near=f.rooms.r0c1.mobs.slice(0,count/2);
 own.forEach(m=>Object.assign(m,{x:.9,y:.55}));near.forEach(m=>Object.assign(m,{x:.04,y:.55}));
 const mobs=[...own,...near];
 for(const m of mobs)Object.assign(m,{ai:null,aggro:true,aggressive:true,attackMs:4000,nextAttackAt:NOW,path:[]});
 return mobs;
}

test('after a pause in polling stale swings are dropped to one per monster and cannot kill the hero',()=>{
 const s=hero(),f=s.game.hunt.field;advanceHunt(s,NOW+1000,()=>.5);
 const mobs=ambush(s,6);s.game.gameClass.stats.hp=60;
 const hits=advanceHunt(s,NOW+30000,()=>.5).filter(n=>n.combat?.kind==='incoming');
 assert.ok(hits.length>0&&hits.length<=mobs.length,'at most one swing per monster after the gap, and they do land');
 assert.ok(s.game.gameClass.stats.hp>=1,'a catch-up swing never finishes the hero');assert.ok(!(s.game.respawnTime>NOW+30000));
 assert.equal(f.gapGuard,undefined,'the guard lasts one tick only');assert.equal(f.polledAt,NOW+30000);
});

test('steady polling is not softened: the same swings can kill a hero without a gap',()=>{
 const s=hero();advanceHunt(s,NOW+1000,()=>.5);
 ambush(s,6);s.game.gameClass.stats.hp=1;
 advanceHunt(s,NOW+2000,()=>.5);
 assert.equal(s.game.gameClass.stats.hp,0);assert.ok(s.game.respawnTime>NOW+2000,'a regular tick can still kill');
});
