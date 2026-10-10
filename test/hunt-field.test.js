import test from 'node:test';
import assert from 'node:assert/strict';
import {enterHuntField, advanceHunt, ensureHunt, moveHuntField, selectHuntTarget, useHuntSkill, fleeHunt} from '../functions/game/hunt/huntFight.js';
import {getZone, getMobDef} from '../functions/game/hunt/huntMobs.js';
import {huntDropPreview, dropGapFactor} from '../functions/game/hunt/huntRewards.js';
import {HUNT, CHAMPIONS} from '../functions/game/hunt/huntConfig.js';
import {getHuntState} from '../miniapp/hunt.js';
import {applyBossDebuff} from '../functions/game/boss/bossDebuffs.js';
import changePlayerGameClass from '../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../functions/game/player/updatePlayerStats.js';
import calcDamage from '../functions/game/boss/calcDamage.js';

const NOW=1_800_000_000_000;
function fixture(){
 const s={userId:0,userChatData:{user:{id:0}},game:{stats:{lvl:80,currentExp:0},inventory:{gold:0,sp:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changePlayerGameClass(s,'mage');updatePlayerStats(s);
 assert.equal(enterHuntField(s,'catacomb-forbidden-path',{now:NOW,random:()=>.5}).ok,true);
 return s;
}

test('selection is peaceful, approach provokes only nearby aggressive actors',()=>{
 const s=fixture(),h=s.game.hunt,hp=s.game.gameClass.stats.hp;
 assert.equal(h.field.mobs.length,3);
 const id=h.field.mobs[2].instanceId;
 assert.equal(selectHuntTarget(s,id,NOW).ok,true);
 advanceHunt(s,NOW+1000,()=>.5);assert.equal(s.game.gameClass.stats.hp,hp);
 moveHuntField(s,'forward',NOW+1000);moveHuntField(s,'forward',NOW+1000);moveHuntField(s,'forward',NOW+1000);
 assert.deepEqual(h.field.mobs.map(m=>m.aggro),[true,false,true]);
 assert.equal(moveHuntField(s,'teleport',NOW+1000).ok,false);
 assert.equal(selectHuntTarget(s,'forged-id',NOW+1000).ok,false);
});

test('damaging skills provoke the target and helpers; state survives a JSON save/load',async()=>{
 const s=fixture(),h=s.game.hunt;
 h.field.mobs[1].x=.25;h.field.mobs[1].y=.3;
 const target=h.mob,old=target.currentHp;
 assert.equal(useHuntSkill(s,0,{now:NOW,random:()=>.5}).ok,true);
 assert.ok(target.currentHp<old);assert.ok(target.aggro);assert.ok(h.field.mobs[1].aggro);
 const restored=JSON.parse(JSON.stringify(s));ensureHunt(restored);
 assert.equal(restored.game.hunt.mob,restored.game.hunt.field.mobs[0]);
 const dto=await getHuntState(restored,NOW);
 assert.equal(dto.field.mobs.length,3);assert.ok(dto.mob.drops.length);assert.ok(dto.mob.aggro);
});

test('a healer heals a living ally and silence interrupts its healing',()=>{
 const s=fixture(),h=s.game.hunt,ally=h.field.mobs[0],healer=h.field.mobs[1];
 ally.currentHp=Math.floor(ally.hp*.5);healer.aggro=true;healer.nextAttackAt=NOW+1000;
 const before=ally.currentHp;advanceHunt(s,NOW+1000,()=>.5);
 assert.equal(ally.currentHp,before+Math.round(ally.hp*.12));
 assert.ok(h.log.some(l=>l.text.includes('лечит')));
 ally.currentHp=before;healer.nextAbilityAt=0;healer.nextAttackAt=NOW+2000;
 applyBossDebuff(healer,{kind:'mute',amount:100,seconds:8},NOW+1000);
 advanceHunt(s,NOW+2000,()=>.5);assert.equal(ally.currentHp,before);
});

test('mob buffs and player debuffs affect damage, expire, and stun skips the turn',()=>{
 const s=fixture(),h=s.game.hunt,mage=h.field.mobs[2];mage.aggro=true;mage.nextAttackAt=NOW+1000;mage.turn=2;
 advanceHunt(s,NOW+1000,()=>.5);assert.equal(h.playerDebuffs[0].kind,'weaken');
 const skill={...s.game.gameClass.skills[0],critChanceBonus:0};
 // Force identical damage randoms to compare the debuff's actual contribution.
 const previousRandom=Math.random;Math.random=()=>.99;
 try {const weakened=calcDamage(s,skill,mage,{consume:false,now:NOW+1001}).dmg;const normal=calcDamage(s,skill,mage,{consume:false,now:NOW+10000}).dmg;assert.ok(weakened<normal*.9);} finally{Math.random=previousRandom;}
 const fighter=h.field.mobs[0];fighter.aggro=true;fighter.nextAttackAt=NOW+2000;
 applyBossDebuff(fighter,{kind:'stun',seconds:3},NOW+1000);advanceHunt(s,NOW+2000,()=>.5);
 assert.equal(fighter.buffs.length,0);assert.ok(h.log.some(l=>l.text.includes('оглушён')));
 fighter.nextAttackAt=NOW+5000;advanceHunt(s,NOW+5000,()=>.5);assert.ok(fighter.buffs.some(b=>b.kind==='power'));
});

test('killed actors leave the battlefield and pay once; fleeing clears combat state',()=>{
 const s=fixture(),h=s.game.hunt;h.mob.currentHp=1;
 const killed=h.mob.instanceId;const result=useHuntSkill(s,0,{now:NOW,random:()=>.5});
 assert.ok(result.killed);assert.equal(h.kills,1);assert.equal(h.field.mobs.length,2);
 assert.equal(h.field.mobs.some(m=>m.instanceId===killed),false);
 advanceHunt(s,NOW+100,()=>.5);assert.equal(h.kills,1);
 assert.equal(fleeHunt(s,NOW+100).ok,true);assert.equal(h.field,null);assert.deepEqual(h.playerDebuffs,[]);
});

test('drop preview uses actual scaled rates, champion bonuses and level penalties',()=>{
 const zone=getZone('catacomb-forbidden-path'),mob=zone.mobs[0],level=mob.level+8;
 const rows=huntDropPreview(level,mob,'red');
 for(const drop of mob.drops){const row=rows.find(r=>r.key===drop.key);assert.ok(row);assert.equal(row.chance,Math.min(100,drop.chance*HUNT.dropRate*dropGapFactor(level,mob.level,HUNT.itemGap)*CHAMPIONS.red.drops));assert.equal(row.min,drop.min);assert.equal(row.max,drop.max);}
 const gold=rows.find(r=>r.key==='gold');if(gold)assert.equal(gold.min,Math.max(1,Math.round(mob.gold.min*HUNT.goldScale)));
 assert.ok(getMobDef(zone,mob.id));
});

test('aggressive actors pursue the player, stop at range, and cannot move during stun',()=>{
 const s=fixture(),h=s.game.hunt,mob=h.field.mobs[0];
 mob.aggro=true;mob.lastMoveAt=NOW;mob.nextAttackAt=NOW+1000;
 const distance=()=>Math.hypot(mob.x-h.field.x,mob.y-h.field.y);
 const before=distance();advanceHunt(s,NOW+1000,()=>.5);assert.ok(distance()<before);
 applyBossDebuff(mob,{kind:'stun',seconds:3},NOW+1000);
 const position=[mob.x,mob.y];advanceHunt(s,NOW+2000,()=>.5);assert.deepEqual([mob.x,mob.y],position);
 advanceHunt(s,NOW+10000,()=>.5);advanceHunt(s,NOW+14000,()=>.5);
 assert.ok(distance()<=.201);assert.ok(distance()>=.199);
});
