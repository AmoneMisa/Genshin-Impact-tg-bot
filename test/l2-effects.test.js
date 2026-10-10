import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import {applyL2Effect,resolveEffectSkill,classEffectSkills,l2RawStat,l2ActionBlock,l2HasControl,tickL2Effects,removeL2Effects,l2TransferDamage,l2MoveMultiplier} from '../functions/game/player/l2Effects.js';
import fs from 'node:fs';
import {L2_EFFECT_SKILLS} from '../template/l2EffectSkills.js';
import {L2_EFFECT_ART,l2EffectIcon} from '../webapp/art/l2-effects-art.js';
import {castL2Buff} from '../miniapp/l2Buffs.js';
import {advanceFieldPvp} from '../functions/game/hunt/fieldPvp.js';
import {getClassBuffsState} from '../miniapp/buffs.js';
import getAttack from '../functions/game/player/getters/getAttack.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import {applyPotionBuff} from '../functions/game/player/potionBuffs.js';
const NOW=Date.now();
function hero(name='saint',id=1,level=85){
 const s={userId:id,userChatData:{user:{id,first_name:'Hero '+id}},game:{stats:{lvl:level,currentExp:0},inventory:{gold:1e8,sp:1e8,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(s,name);updateStats(s);return s;
}
test('level tables, original learning gates and class inheritance are preserved',()=>{
 assert.equal(resolveEffectSkill(1059,3).effects[0].children[0].value,'1.75');
 const high=classEffectSkills(hero()),low=classEffectSkills(hero('saint',1,10));
 assert.ok(high.some(s=>s.id===1085&&s.learnedLevel>0));
 assert.ok(high.some(s=>s.group==='Песни'));assert.ok(high.some(s=>s.group==='Танцы'));
 assert.ok(low.find(s=>s.id===1356).learnedLevel===0);
 assert.ok(getClassBuffsState(hero()).l2Skills.length>100);
 assert.equal(castL2Buff(hero('warrior'),'l2:1356',null,{now:NOW}).reason,'not_learned');
});
test('native effects modify real stats, share stack groups with potions and expire',()=>{
 const s=hero('warrior'),before=getAttack(s);
 applyPotionBuff(s,'might',NOW);applyL2Effect(s,s,1068,3,{now:NOW});
 assert.equal(s.game.effects.filter(e=>e.potionId==='might').length,0);
 assert.ok(Math.abs(getAttack(s)/before-1.15)<.01);
 const weaker=applyL2Effect(s,s,1068,1,{now:NOW+1000});assert.equal(weaker.kept,true);
 assert.equal(s.game.effects.length,1);assert.equal(l2RawStat(s,'pAtk',true,NOW+1200001),1);
 applyL2Effect(s,s,1045,6,{now:NOW});assert.ok(getMaxHp(s)>s.game.gameClass.stats.maxHp);
});
test('poison ticks settle once across reloads and remove-by-slot actually cures it',()=>{
 const caster=hero(),target=hero('warrior',2);
 const hp=target.game.gameClass.stats.hp;
 applyL2Effect(caster,target,1168,1,{now:NOW,guaranteed:true});
 assert.ok(tickL2Effects(target,NOW+6000).damage>0);assert.ok(target.game.gameClass.stats.hp<hp);
 const reloaded=JSON.parse(JSON.stringify(target));
 assert.equal(tickL2Effects(reloaded,NOW+6000).damage,0);
 const result=applyL2Effect(caster,reloaded,1012,3,{now:NOW+7000});
 assert.ok(result.removed>0);assert.equal(tickL2Effects(reloaded,NOW+12000).damage,0);
});
test('control, resistance, silence, root and invulnerability affect actions',()=>{
 const a=hero(),b=hero('warrior',2);
 applyL2Effect(a,b,1201,10,{now:NOW,guaranteed:true});assert.equal(l2ActionBlock(b,{move:true},NOW),'effect_root');
 applyL2Effect(a,b,1064,1,{now:NOW,guaranteed:true});assert.equal(l2ActionBlock(b,{magic:true},NOW),'effect_silence');
 applyL2Effect(a,b,1418,1,{now:NOW});assert.equal(l2HasControl(b,'Invincible',NOW),true);
 assert.equal(applyL2Effect(a,b,1168,1,{now:NOW,random:()=>0}).resisted,true);
 removeL2Effects(b,{kind:'debuff'},NOW);assert.equal(l2ActionBlock(b,{move:true},NOW),null);
});
test('casting is atomic on rejection and pays mana/cooldown only on a valid cast',()=>{
 const s=hero();s.game.gameClass.stats.mp=0;
 assert.equal(castL2Buff(s,'l2:1085',null,{now:NOW}).reason,'not_enough_mp');
 assert.equal(s.game.l2CastAt,undefined);assert.equal(s.game.effects.length,0);
 s.game.gameClass.stats.mp=10000;const before=s.game.gameClass.stats.mp;
 const result=castL2Buff(s,'l2:1085',null,{now:NOW});assert.equal(result.ok,true);assert.ok(result.spent>0);assert.equal(s.game.gameClass.stats.mp,before-result.spent);
 assert.equal(castL2Buff(s,'l2:1085',null,{now:NOW}).reason,'cooldown');
});
test('improved buffs remove and block the lesser group, toggles switch off without more mana',()=>{
 const s=hero();applyL2Effect(s,s,1268,4,{now:NOW});
 applyL2Effect(s,s,1519,1,{now:NOW});assert.equal(s.game.effects.some(e=>e.l2SkillId===1268),false);
 assert.equal(applyL2Effect(s,s,1268,4,{now:NOW+1000}).blocked,true);
 const archer=hero('hawkeye');assert.equal(castL2Buff(archer,'l2:256',null,{now:NOW}).ok,true);
 archer.game.gameClass.stats.mp=0;const off=castL2Buff(archer,'l2:256',null,{now:NOW+100});assert.equal(off.toggledOff,true);assert.equal(off.spent,0);
});
test('hostile effects respect field, range and force rules; poison PK is credited once',()=>{
 const a=hero('soulReaper'),b=hero('warrior',2);const chat={members:[a,b]};a.ownerDocument=()=>chat;b.ownerDocument=()=>chat;
 for(const s of [a,b])s.game.hunt={zone:'test',mob:null,lastActionAt:NOW,field:{x:.5,y:.5,seenAt:NOW,mobs:[]}};
 assert.equal(castL2Buff(a,'l2:1168',2,{now:NOW,random:()=>0}).reason,'pvp_force_required');
 assert.equal(castL2Buff(a,'l2:1168',2,{now:NOW,random:()=>0,force:true}).ok,true);
 b.game.gameClass.stats.hp=1;advanceFieldPvp(chat,NOW+6000);
 assert.equal(a.game.worldPvp.pkKills,1);assert.ok(a.game.worldPvp.karma>0);
 advanceFieldPvp(chat,NOW+9000);assert.equal(a.game.worldPvp.pkKills,1);
});
test('original icon bindings are complete for supplied art and every published size exists',()=>{
 assert.ok(Object.keys(L2_EFFECT_SKILLS).length>2900);
 for(const skill of Object.values(L2_EFFECT_SKILLS)){
  if(!skill.art){assert.equal(l2EffectIcon('l2:'+skill.id),'');continue;}
  assert.equal(L2_EFFECT_ART[skill.id],skill.art);
  for(const size of [32,64,128])assert.ok(fs.existsSync(`webapp/art/l2-effects/${skill.art}-${size}.webp`),`${skill.id}: ${size}`);
 }
 assert.equal(l2EffectIcon('l2:<script>'),'');
});
test('Shield of Faith transfers to its nearby caster once and stops when the caster leaves',()=>{
 const caster=hero('phoenixKnight'),target=hero('warrior',2),chat={members:[caster,target]};
 caster.ownerDocument=()=>chat;target.ownerDocument=()=>chat;
 for(const s of [caster,target])s.game.hunt={zone:'test',field:{x:.5,y:.5}};
 applyL2Effect(caster,target,528,1,{now:NOW});const hp=caster.game.gameClass.stats.hp;
 assert.equal(l2TransferDamage(target,100,NOW),10);assert.equal(caster.game.gameClass.stats.hp,hp-90);
 caster.game.hunt.zone='other';assert.equal(l2TransferDamage(target,100,NOW),100);
});
test('movement slows, strong buffs survive weaker potions and damage-over-time death protection is consumed once',()=>{
 const s=hero();applyL2Effect(s,s,1160,1,{now:NOW,guaranteed:true});assert.ok(l2MoveMultiplier(s,NOW)<1);
 applyL2Effect(s,s,1068,3,{now:NOW});applyPotionBuff(s,'might',NOW+1000,{factor:.5});assert.ok(s.game.effects.some(e=>e.l2SkillId===1068));
 const protection=Object.values(L2_EFFECT_SKILLS).find(x=>x.effects.some(e=>e.name==='ResurrectionSpecial'));
 applyL2Effect(s,s,protection.id,1,{now:NOW});applyL2Effect(s,s,1168,1,{now:NOW,guaranteed:true});
 s.game.gameClass.stats.hp=1;tickL2Effects(s,NOW+3000);assert.ok(s.game.gameClass.stats.hp>0);assert.equal(s.game.l2PendingDeath,undefined);
 s.game.gameClass.stats.hp=1;tickL2Effects(s,NOW+6000);assert.equal(s.game.gameClass.stats.hp,0);
});
test('offensive skills without isDebuff are routed to enemies and unavailable actor contexts never charge mana',()=>{
 assert.equal(resolveEffectSkill(321).kind,'debuff');assert.equal(resolveEffectSkill(1344).kind,'debuff');
 const knight=hero('phoenixKnight'),entry=classEffectSkills(knight,{includeLocked:false}).find(s=>s.effects.some(e=>e.name==='Transformation'));
 assert.ok(entry);const mp=knight.game.gameClass.stats.mp;
 assert.equal(castL2Buff(knight,'l2:'+entry.id,null,{now:NOW}).reason,'requires_transformation');assert.equal(knight.game.gameClass.stats.mp,mp);
});
