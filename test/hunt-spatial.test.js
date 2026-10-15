import test from 'node:test';
import assert from 'node:assert/strict';
import {enterHuntField,advanceHunt,moveHuntField,useHuntSkill,setHuntAttack,selectHuntTarget} from '../functions/game/hunt/huntFight.js';
import {skillSpatial,weaponSpatial,clearLine} from '../functions/game/hunt/huntSpatial.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import {getHuntState} from '../miniapp/hunt.js';

const NOW=Date.now();
function fixture(){
 const session={userId:0,userChatData:{user:{id:0}},game:{stats:{lvl:80,currentExp:0},inventory:{gold:0,sp:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(session,'humanFighter');updateStats(session);
 assert.ok(enterHuntField(session,'catacomb-forbidden-path',{now:NOW,random:()=>.5}).ok);
 const field=session.game.hunt.field;field.mobs.forEach(m=>{m.aggressive=false;m.nextAttackAt=NOW+1e6;});
 return session;
}
function tick(s,now){s.game.hunt.field.seenAt=now;return advanceHunt(s,now,()=>.5);}

test('weapon autoattack approaches, observes cadence and stops on manual movement',()=>{
 const s=fixture(),h=s.game.hunt,mob=h.mob,before=mob.currentHp;
 assert.ok(setHuntAttack(s,true,NOW).ok);assert.equal(mob.currentHp,before);assert.ok(h.field.path.length);
 for(let i=1;i<=80&&mob.currentHp===before;i++)tick(s,NOW+i*500);
 assert.ok(mob.currentHp<before);const hp=mob.currentHp;
 advanceHunt(s,h.field.moveAt,()=>.5);assert.equal(mob.currentHp,hp,'same timestamp never adds another attack');
 assert.ok(moveHuntField(s,{x:.8,y:.8},h.field.moveAt+1).ok);
 assert.equal(h.field.autoAttack,undefined);assert.equal(h.field.action,undefined);
});

test('pole autoattack uses original weapon cone and target limit, and spends one buff charge',()=>{
 const s=fixture(),h=s.game.hunt,f=h.field;
 s.game.equipmentStats.rhand={name:'Short Spear',mainType:'weapon',kind:'pole',grade:'noGrade',isFilled:true,characteristics:{}};
 f.x=.5;f.y=.5;
 const [a,b,c]=f.mobs;Object.assign(a,{x:.52,y:.5});Object.assign(b,{x:.52,y:.505});Object.assign(c,{x:.48,y:.5});
 const hp=f.mobs.map(m=>m.currentHp);
 s.game.effects.push({name:'addDamageToBoss',amount:10,count:2});
 assert.equal(weaponSpatial(s,NOW).range,80);assert.equal(weaponSpatial(s,NOW).limit,5);
 setHuntAttack(s,true,NOW);
 assert.ok(a.currentHp<hp[0]);assert.ok(b.currentHp<hp[1]);assert.equal(c.currentHp,hp[2]);
 assert.equal(s.game.effects.find(e=>e.name==='addDamageToBoss').count,1);
});

test('a real frontal area skill casts once, pays once and rewards all affected kills once',()=>{
 const s=fixture(),h=s.game.hunt,f=h.field;
 const skill={...s.game.gameClass.skills[1],name:'Whirlwind',l2Id:9,tier:undefined,cost:10,cooldown:2};
 s.game.gameClass.skills=[skill];
 f.x=.5;f.y=.5;
 const [a,b,c]=f.mobs;Object.assign(a,{x:.51,y:.5,currentHp:1});Object.assign(b,{x:.52,y:.51,currentHp:1});Object.assign(c,{x:.48,y:.5});
 const mp=s.game.gameClass.stats.mp,hp=c.currentHp;
 assert.equal(skillSpatial(s,skill,NOW).radius,200);
 assert.ok(useHuntSkill(s,0,{now:NOW}).queued);assert.equal(h.kills,0);assert.equal(s.game.gameClass.stats.mp,mp);
 tick(s,NOW+721);assert.equal(h.kills,2);assert.equal(s.game.gameClass.stats.mp,mp-10);assert.equal(c.currentHp,hp);
 const gold=s.game.inventory.gold;tick(s,NOW+1500);assert.equal(h.kills,2);assert.equal(s.game.inventory.gold,gold);
});

test('walking or choosing another target cancels a spell without spending its resources',()=>{
 const s=fixture(),f=s.game.hunt.field;
 changeClass(s,'humanMystic');updateStats(s);f.x=s.game.hunt.mob.x;f.y=s.game.hunt.mob.y+.01;
 const mp=s.game.gameClass.stats.mp;
 assert.equal(useHuntSkill(s,0,{now:NOW}).queued,true);
 assert.ok(selectHuntTarget(s,f.mobs[1].instanceId,NOW+10).ok);
 assert.equal(f.action,undefined);assert.equal(s.game.gameClass.stats.mp,mp);
});

test('background inactivity ends autoattack without a burst of overdue attacks',()=>{
 const s=fixture(),f=s.game.hunt.field,m=s.game.hunt.mob;
 f.x=m.x;f.y=m.y+.005;setHuntAttack(s,true,NOW);const hp=m.currentHp;
 advanceHunt(s,NOW+30000,()=>.5);
 assert.equal(f.autoAttack,undefined);assert.equal(m.currentHp,hp);
});

test('bow attacks pay the original weapon MP cost, one arrow and respect bow reuse',()=>{
 const s=fixture(),h=s.game.hunt,f=h.field;
 s.game.equipmentStats.rhand={name:'Short Bow',mainType:'weapon',kind:'bow',grade:'noGrade',isFilled:true,characteristics:{}};
 s.game.ammoStarter=true;s.game.inventory.materials.l2_17=3;
 f.x=h.mob.x;f.y=h.mob.y+.1;
 const mp=s.game.gameClass.stats.mp,profile=weaponSpatial(s,NOW);
 assert.equal(profile.costMp,1);assert.ok(profile.interval>3000);
 setHuntAttack(s,true,NOW);assert.equal(s.game.gameClass.stats.mp,mp-1);assert.equal(s.game.inventory.materials.l2_17,2);
 tick(s,NOW+100);assert.equal(s.game.inventory.materials.l2_17,2);
});

test('spells cannot hit through room walls and missing source geometry is explicit',()=>{
 assert.equal(clearLine({x:.1,y:.5},{x:.9,y:.5},[{x:.45,y:.3,w:.1,h:.4}]),false);
 assert.equal(clearLine({x:.1,y:.1},{x:.9,y:.1},[{x:.45,y:.3,w:.1,h:.4}]),true);
 const s=fixture();s.game.gameClass.skills.push({name:'Unknown',isDealDamage:true,l2Id:999999});
 assert.equal(useHuntSkill(s,s.game.gameClass.skills.length-1,{now:NOW}).reason,'combat_data_missing');
});

test('room exits are actual neighbours, entering uses the matching edge and interrupts combat',async()=>{
 const s=fixture(),f=s.game.hunt.field,dto=await getHuntState(s,NOW);
 const exit=dto.field.exits.find(e=>e.side==='east');assert.ok(exit);
 setHuntAttack(s,true,NOW);assert.ok(moveHuntField(s,'room:'+exit.id,NOW+1).ok);
 assert.equal(f.autoAttack,undefined);assert.equal(f.pendingRoom,exit.id);
 advanceHunt(s,NOW+30000,()=>.5);assert.equal(f.room,exit.id);assert.equal(f.x,.05);assert.equal(f.y,.5);
});
