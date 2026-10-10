import test from 'node:test';
import assert from 'node:assert/strict';
import {castL2Buff} from '../miniapp/l2Buffs.js';
import {resolveEffectSkill,classEffectSkills,l2RawStat,l2CompanionDamage,isL2PetSkill,applyL2Effect,l2ActionBlock} from '../functions/game/player/l2Effects.js';
import userDealDamage from '../functions/game/player/userDealDamage.js';
const NOW=Date.now();
function hero(name='soulReaper'){
 return {userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:85},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],respawnTime:0,gameClass:{stats:{name,attack:1000,defence:100,hp:10000,maxHp:10000,mp:10000,maxMp:10000,cp:1000,maxCp:1000,criticalChance:0,criticalDamage:1,additionalDamageMul:0,speed:100,incomingDamageModifier:1},skills:[]}}};
}
test('summons cost only mana, need no items or corpse, and replace the previous companion',()=>{
 const s=hero(),mp=s.game.gameClass.stats.mp;
 const first=castL2Buff(s,'l2:1154',null,{now:NOW});assert.equal(first.ok,true);assert.equal(s.game.gameClass.stats.mp,mp-first.spent);
 assert.ok(l2CompanionDamage(s,100,NOW)>0);assert.deepEqual(s.game.inventory.materials,{});assert.equal(s.game.inventory.gold,0);
 const second=castL2Buff(s,'l2:1111',null,{now:NOW+1000});assert.equal(second.ok,true);
 assert.equal(s.game.effects.filter(e=>isL2PetSkill(resolveEffectSkill(e.l2SkillId,e.level))).length,1);
 const reloaded=JSON.parse(JSON.stringify(s));assert.equal(l2CompanionDamage(reloaded,100,NOW+1000),l2CompanionDamage(s,100,NOW+1000));
 assert.equal(l2CompanionDamage(reloaded,100,second.until+1),0);
});
test('insufficient mana spends nothing; servitor support skills work without a pet actor',()=>{
 const s=hero();s.game.gameClass.stats.mp=0;
 assert.equal(castL2Buff(s,'l2:1111',null,{now:NOW}).reason,'not_enough_mp');assert.equal(s.game.effects.length,0);assert.equal(s.game.l2CastAt,undefined);
 s.game.gameClass.stats.mp=10000;
 assert.equal(castL2Buff(s,'l2:1557',null,{now:NOW}).ok,true);assert.equal(l2RawStat(s,'mAtk',true,NOW),1.25);
 assert.equal(castL2Buff(s,'l2:1299',null,{now:NOW}).ok,true);assert.ok(l2RawStat(s,'mDef',false,NOW)>0);
 assert.equal(s.game.pet,undefined);
});
test('companions add actual battle damage and native L2 class names keep their pet trees',()=>{
 const s=hero();const mob=()=>({name:'test',hp:1e6,currentHp:1e6,stats:{lvl:85},hunt:{defence:100},listOfDamage:[],minions:[],debuffs:[]});
 const skill={isDealDamage:true,damageModifier:1,effect:'common_attack'},before=userDealDamage(s,mob(),skill,{now:NOW}).dealt;
 castL2Buff(s,'l2:1111',null,{now:NOW});const hit=userDealDamage(s,mob(),skill,{now:NOW});
 assert.ok(hit.companionDamage>0);assert.ok(hit.dealt>before);
 assert.ok(classEffectSkills(hero('arcanaLord')).some(s=>s.id===1406&&s.learnedLevel>0));
});
test('adapted pet disruption is real control and observes resistance',()=>{
 const s=hero(),target=hero('warrior');
 applyL2Effect(s,target,1380,1,{now:NOW,guaranteed:true});assert.equal(l2ActionBlock(target,{attack:true},NOW),'effect_betray');
 assert.equal(l2ActionBlock(target,{attack:true},NOW+30001),null);
});
