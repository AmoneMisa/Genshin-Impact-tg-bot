import test from 'node:test';
import assert from 'node:assert/strict';
import getAttack from '../functions/game/player/getters/getAttack.js';
import getDefence from '../functions/game/player/getters/getDefence.js';
import {skillCombatType} from '../functions/game/player/combatType.js';
import {applyPotionBuff} from '../functions/game/player/potionBuffs.js';
import {applyL2Effect} from '../functions/game/player/l2Effects.js';
import calcDamage from '../functions/game/boss/calcDamage.js';
import calcBossHit from '../functions/game/boss/bossHit.js';
import fight from '../functions/game/arena/playerDamagePlayer.js';
import {getBossAttacks} from '../template/bossAttacksTemplate.js';
import scaleClassStats from '../functions/game/player/scaleClassStats.js';
import {fieldPvpSkillBlock} from '../functions/game/hunt/fieldPvpState.js';
import {armShots,clearShots,setAutoShots} from '../functions/game/shots/shots.js';
import {shotKey} from '../template/shotsData.js';

function player(name='mage') {
    return {userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:20},effects:[],inventory:{},equipmentStats:{},gameClass:{skills:[],stats:{
        name,attack:100,defence:50,pAtk:100,mAtk:200,pDef:50,mDef:250,hp:10000,maxHp:10000,mp:1000,maxMp:1000,cp:0,maxCp:0,
        criticalChance:0,criticalDamage:1,accuracy:20,evasion:0,block:1,additionalDamageMul:1,incomingDamageModifier:1,hpRestoreSpeed:0,cpRestoreSpeed:0,mpRestoreSpeed:0,speed:10,
    }}}};
}
const attack = (s,type) => getAttack(s,undefined,type);
const defence = (s,type) => getDefence(s,undefined,type);

test('independent stats and legacy sessions remain usable',()=>{
    const s=player();
    assert.equal(attack(s,'physical'),100);assert.equal(attack(s,'magic'),200);
    assert.equal(defence(s,'physical'),50);assert.equal(defence(s,'magic'),250);
    for(const key of ['pAtk','mAtk','pDef','mDef'])delete s.game.gameClass.stats[key];
    assert.equal(attack(s,'physical'),100);assert.equal(attack(s,'magic'),100);
    assert.equal(defence(s,'physical'),50);assert.equal(defence(s,'magic'),50);
});

test('Might, Shield and native Empower affect only their intended combat stat',()=>{
    const s=player();
    applyPotionBuff(s,'might');applyPotionBuff(s,'shield');
    assert.equal(attack(s,'physical'),115);assert.equal(attack(s,'magic'),200);
    assert.equal(defence(s,'physical'),57);assert.equal(defence(s,'magic'),250);
    applyL2Effect(s,s,1059,3);
    assert.ok(attack(s,'magic')>200);assert.equal(attack(s,'physical'),115);
});

test('armor and jewelry protect different channels; duplicate item rolls are retained',()=>{
    const s=player();
    s.game.equipmentStats={body:{mainType:'armor',type:'test_armor',isFilled:true,characteristics:{defence:20}},neck:{mainType:'jewelry',type:'test_neck',isFilled:true,characteristics:{defence:30}},weapon:{mainType:'weapon',type:'test_sword',isFilled:true,stats:[{name:'attack',value:5},{name:'attack',value:7}]}};
    assert.equal(defence(s,'physical'),70);assert.equal(defence(s,'magic'),280);
    assert.equal(attack(s,'physical'),112);
});

test('physical and magical Life Stone attack skills do not leak into the other channel',()=>{
    const s=player();
    s.game.equipmentStats={weapon:{mainType:'weapon',isFilled:true,type:'test_staff',augment:{skill:{id:'passive_magic_power',level:2}}}};
    assert.equal(attack(s,'physical'),100);assert.equal(attack(s,'magic'),206);
    s.game.lsBuff={id:'active_might',level:1,until:Date.now()+60000};
    assert.equal(attack(s,'physical'),104);assert.equal(attack(s,'magic'),206);
});

test('a weapon supplies both attacks using its original ratio',()=>{
    const s=player();
    s.game.equipmentStats={weapon:{mainType:'weapon',isFilled:true,type:'test_staff',classOwner:['mage'],characteristics:{power:100},lineage:{pAtk:10,mAtk:40}}};
    assert.equal(attack(s,'physical'),125);assert.equal(attack(s,'magic'),400);
});

test('silence and shots follow the skill channel even for a mixed caster',()=>{
    const s=player();
    const now=Date.now(),physical={isDealDamage:true,damageType:'physical'},magic={isDealDamage:true,damageType:'magic'};
    s.game.worldPvp={effects:{debuffs:[{kind:'mute',amount:1,until:now+60000}]}};
    assert.equal(fieldPvpSkillBlock(s,physical,now),null);
    assert.equal(fieldPvpSkillBlock(s,magic,now),'pvp_silenced');
    s.game.autoShots=true;s.game.equipmentStats={weapon:{mainType:'weapon',isFilled:true,type:'test_staff',grade:'D'}};
    s.game.inventory.materials={[shotKey('soulshot','D')]:100,[shotKey('blessed','D')]:100};
    setAutoShots(s,true,'soulshot');
    assert.equal(armShots(s,physical)?.kind,'soulshot');clearShots(s);
    assert.equal(armShots(s,magic),null,'physical shot mode cannot also arm magical shots');
    setAutoShots(s,true,'blessed');
    assert.equal(armShots(s,physical),null,'magical shot mode cannot also arm soulshots');
    assert.equal(armShots(s,magic)?.kind,'blessed');clearShots(s);
});

test('skill metadata overrides the class family and native skills supply their damage type',()=>{
    assert.equal(skillCombatType({damageType:'physical'},{name:'mage'}),'physical');
    assert.equal(skillCombatType({damageType:'magic'},{name:'warrior'}),'magic');
    assert.equal(skillCombatType({l2Id:1230},{name:'warrior'}),'magic');
    assert.equal(skillCombatType({fields:{isMagic:'0'}},{name:'mage'}),'physical');
});

test('hunt and field PvP damage use matching attack and defense; armor break affects physical hits',()=>{
    const s=player();
    const target={hunt:{pDef:100,mDef:400},stats:{lvl:20},debuffs:[]};
    const phys={damageType:'physical',damageModifier:1},magic={damageType:'magic',damageModifier:1};
    const original=Math.random;Math.random=()=>.99;
    try {
        const p=calcDamage(s,phys,target,{consume:false}).dmg;
        const m=calcDamage(s,magic,target,{consume:false}).dmg;
        assert.ok(p>m);
        target.debuffs=[{kind:'armorBreak',amount:.5,until:Date.now()+60000}];
        assert.ok(calcDamage(s,phys,target,{consume:false}).dmg>p);
        assert.equal(calcDamage(s,magic,target,{consume:false}).dmg,m);
        target.playerTarget={pDef:100,mDef:400,incoming:1,guard:0};
        assert.ok(calcDamage(s,phys,target,{consume:false}).dmg>calcDamage(s,magic,target,{consume:false}).dmg);
    } finally {Math.random=original;}
});

test('arena uses skill type rather than the class of the attacker or defender',()=>{
    const s=player(),target=player('warrior');
    target.game.gameClass.stats.pDef=50;target.game.gameClass.stats.mDef=1000;
    const original=Math.random;Math.random=()=>.5;
    try {
        s.game.gameClass.skills=[{isDealDamage:true,damageType:'physical',damageModifier:1,cost:0,cooldown:10}];
        const p=fight(s,target,false,false,1,false,{defenderActs:false})[2].defender.taken;
        s.game.gameClass.skills[0].damageType='magic';
        const m=fight(s,target,false,false,1,false,{defenderActs:false})[2].defender.taken;
        assert.ok(p>m,`${p} physical versus ${m} magical`);
    } finally {Math.random=original;}
});

test('incoming boss spells use M.Def and all authored attacks declare a type',()=>{
    const s=player();
    const boss={name:'kivaha',stats:{lvl:1,criticalChance:0},debuffs:[]};
    const options={random:()=>.5};
    assert.ok(calcBossHit(boss,s,{...options,damageType:'physical'})>calcBossHit(boss,s,{...options,damageType:'magic'}));
    assert.ok(getBossAttacks('kivaha').every(a=>a.damageType==='magic'));
    assert.equal(getBossAttacks('tiamara').find(a=>a.key==='triple_bite').damageType,'physical');
});

test('level scaling retains independent base ratios',()=>{
    const scaled=scaleClassStats(player().game.gameClass.stats,20);
    assert.ok(scaled.mAtk>scaled.pAtk);assert.ok(scaled.mDef>scaled.pDef);
});
