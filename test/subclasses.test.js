import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import {getSubclassState,addSubclass,switchProfession,subclassChoiceReason,professionReplacementReason} from '../functions/game/player/subclasses.js';
import {changePlayerRaceForMiniApp,getPlayerProfileState,changePlayerClassForMiniApp} from '../miniapp/playerProfile.js';
import {createMiniAppState} from '../miniapp/state.js';
import setLevel from '../functions/game/player/setLevel.js';
import {gainExp} from '../functions/game/player/vitality.js';
import {recordDeath,refundDeathExp} from '../functions/game/player/deathPenalties.js';

function hero(name='phoenixKnight',level=80){
  const s={gender:'male',game:{stats:{lvl:level,currentExp:123,needExp:456,inFightTimer:0},inventory:{luckCoins:100,sp:987,gold:200,equipment:{items:[]}},equipmentStats:{},effects:[],learnedSkills:{1068:true},skillEnchants:{1068:{route:1,level:5}},tattoos:[{dye:4445}],classQuest:{active:null,completed:['humanKnight','paladin','phoenixKnight']}}};
  changeClass(s,name);updateStats(s);return s;
}
test('12 CoL race-only service preserves profession, combat values and all class progress',()=>{
  const s=hero(),before=structuredClone(s.game),p=getPlayerProfileState(s);
  assert.equal(p.raceChangeCost,12);assert.equal(changePlayerRaceForMiniApp(s,'darkElf').spent,12);
  assert.equal(s.game.inventory.luckCoins,88);assert.equal(createMiniAppState(s,{}).player.race,'darkElf');
  assert.deepEqual(s.game.gameClass,before.gameClass);assert.deepEqual(s.game.stats,before.stats);
  assert.deepEqual(s.game.tattoos,before.tattoos);assert.deepEqual(s.game.classQuest,before.classQuest);
  assert.equal(changePlayerRaceForMiniApp(s,'darkElf').reason,'same_race');
  assert.equal(changePlayerRaceForMiniApp(s,'unknown').reason,'unknown_race');
  assert.equal(subclassChoiceReason(s,'elvenElder'),'opposing_elf_race');
  s.game.inventory.luckCoins=11;const failed=structuredClone(s);
  assert.equal(changePlayerRaceForMiniApp(s,'elf').reason,'not_enough_luck_coins');assert.deepEqual(s,failed);
});
test('new subclass starts at 40 with zero SP and isolated skills, tattoos and quests',()=>{
  const s=hero();assert.equal(addSubclass(s,'bishop').ok,true);
  assert.equal(s.game.stats.lvl,40);assert.equal(s.game.stats.currentExp,0);assert.equal(s.game.inventory.sp,0);
  assert.deepEqual(s.game.learnedSkills,{});assert.deepEqual(s.game.skillEnchants,{});assert.deepEqual(s.game.tattoos,[]);
  assert.equal(s.game.classQuest.active,null);assert.equal(s.game.gameClass.stats.name,'bishop');
  assert.equal(s.game.inventory.luckCoins,100);assert.equal(createMiniAppState(s,{}).player.race,'human');
});
test('class slots survive serialization and restore earned XP, SP, learned skills and enchant levels',()=>{
  let s=hero();const main=structuredClone(s.game.gameClass);
  addSubclass(s,'bishop');s.game.stats.lvl=61;s.game.stats.currentExp=234;s.game.stats.needExp=678;s.game.inventory.sp=55;
  s.game.learnedSkills={121:true};s.game.skillEnchants={121:{route:2,level:3}};s.game.tattoos=[{dye:4450}];
  s=JSON.parse(JSON.stringify(s));assert.equal(switchProfession(s,0).ok,true);
  assert.equal(s.game.stats.lvl,80);assert.equal(s.game.stats.currentExp,123);assert.equal(s.game.inventory.sp,987);
  assert.deepEqual(s.game.gameClass,main);assert.deepEqual(s.game.learnedSkills,{1068:true});assert.deepEqual(s.game.tattoos,[{dye:4445}]);
  s.game.inventory.sp=500;s.game.inventory.gold=600;s.game.effects=[{name:'guard'}];
  assert.equal(switchProfession(s,1).ok,true);assert.equal(s.game.stats.lvl,61);assert.equal(s.game.stats.currentExp,234);
  assert.equal(s.game.inventory.sp,55);assert.equal(s.game.inventory.gold,600);assert.deepEqual(s.game.effects,[]);
  assert.deepEqual(s.game.learnedSkills,{121:true});assert.deepEqual(s.game.skillEnchants,{121:{route:2,level:3}});assert.deepEqual(s.game.tattoos,[{dye:4450}]);
  switchProfession(s,0);assert.equal(s.game.inventory.sp,500);
});
test('first slot needs 75 and later slots require all previous subclasses at 75; maximum is main plus three',()=>{
  const low=hero('paladin',74),before=structuredClone(low);
  assert.equal(addSubclass(low,'bishop').reason,'subclass_level_required');assert.deepEqual(low,before);
  const s=hero();addSubclass(s,'bishop');switchProfession(s,0);
  assert.equal(addSubclass(s,'spellsinger').reason,'previous_subclass_level_required');
  switchProfession(s,1);s.game.stats.lvl=75;switchProfession(s,0);assert.equal(addSubclass(s,'spellsinger').ok,true);
  s.game.stats.lvl=75;switchProfession(s,0);assert.equal(addSubclass(s,'treasureHunter').ok,true);
  s.game.stats.lvl=75;switchProfession(s,0);assert.equal(addSubclass(s,'necromancer').reason,'subclass_limit');
  assert.equal(getSubclassState(s).slots.length,4);
});
test('High Five class rules exclude main tank group, Overlord, Warsmith, duplicates and opposing elves',()=>{
  const s=hero();for(const name of ['paladin','darkAvenger','templeKnight','shillienKnight'])assert.equal(subclassChoiceReason(s,name),'similar_main_class');
  assert.equal(subclassChoiceReason(s,'overlord'),'forbidden_subclass');assert.equal(subclassChoiceReason(s,'warsmith'),'forbidden_subclass');
  assert.equal(subclassChoiceReason(s,'archmage'),'invalid_subclass');assert.equal(subclassChoiceReason(s,'berserker'),'kamael_subclass_only');
  addSubclass(s,'bishop');assert.equal(subclassChoiceReason(s,'bishop'),'duplicate_subclass');
  assert.equal(subclassChoiceReason(hero('mysticMuse'),'spellhowler'),'opposing_elf_race');
  assert.equal(subclassChoiceReason(hero('stormScreamer'),'elvenElder'),'opposing_elf_race');
  for(const [main,other] of [['adventurer','abyssWalker'],['sagittarius','silverRanger'],['arcanaLord','elementalSummoner'],['archmage','spellsinger']])assert.equal(subclassChoiceReason(hero(main),other),'similar_main_class');
});
test('Kamael Inspector is only the third subclass after two level-75 subclasses',()=>{
  const s=hero('doombringer');assert.equal(subclassChoiceReason(s,'bishop'),'kamael_subclass_only');
  assert.equal(subclassChoiceReason(s,'maleSoulBreaker'),'kamael_gender_variant');assert.equal(subclassChoiceReason(s,'inspector'),'inspector_locked');
  assert.equal(addSubclass(s,'femaleSoulBreaker').ok,true);s.game.stats.lvl=75;switchProfession(s,0);
  assert.equal(subclassChoiceReason(s,'inspector'),'inspector_locked');assert.equal(addSubclass(s,'arbalester').ok,true);
  s.game.stats.lvl=75;switchProfession(s,0);assert.equal(addSubclass(s,'inspector').ok,true);
});
test('switching and adding are blocked while dead, fighting or hunting without changing slots',()=>{
  const s=hero();addSubclass(s,'bishop');
  for(const [set,reason] of [
    [s=>s.game.stats.inFightTimer=Date.now()+100000,'in_combat'],
    [s=>s.game.hunt={field:{}},'not_peaceful'],
    [s=>s.game.gameClass.stats.hp=0,'player_dead'],
    [s=>s.game.effects=[{l2SkillId:283,level:1,until:Date.now()+100000}],'summon_active'],
  ]) {const copy=structuredClone(s);set(copy);const before=structuredClone(copy);assert.equal(switchProfession(copy,0).reason,reason);assert.deepEqual(copy,before);}
  assert.equal(switchProfession(s,1).reason,'same_profession_slot');assert.equal(switchProfession(s,99).reason,'unknown_profession_slot');
});
test('subclass respec cannot bypass class restrictions or break existing slots',()=>{
  const s=hero();addSubclass(s,'bishop');
  assert.equal(changePlayerClassForMiniApp(s,'templeKnight').reason,'similar_main_class');
  assert.equal(changePlayerClassForMiniApp(s,'overlord').reason,'forbidden_subclass');
  switchProfession(s,0);assert.equal(professionReplacementReason(s,'cardinal'),'subclass_conflict');
});
test('subclass leveling and death refunds obey the 40..80 range while main retains 85 cap',()=>{
  const s=hero();addSubclass(s,'bishop');s.game.stats.lvl=79;s.game.stats.currentExp=1e30;setLevel(s);
  assert.equal(s.game.stats.lvl,80);assert.equal(s.game.stats.currentExp,0);assert.equal(gainExp(s,100).gained,0);
  assert.equal(createMiniAppState(s,{}).player.maxLevel,80);
  s.game.stats.lvl=40;s.game.stats.currentExp=0;s.game.gameClass.stats.hp=0;
  recordDeath(s,{random:()=>1});assert.equal(s.game.stats.lvl,40);
  s.game.deathLedger={active:true,lostExp:1e30,refunded:0};s.game.stats.lvl=79;refundDeathExp(s,1);assert.equal(s.game.stats.lvl,80);assert.equal(s.game.stats.currentExp,0);
  s.game.deathLedger=null;s.game.gameClass.stats.hp=1;switchProfession(s,0);assert.equal(createMiniAppState(s,{}).player.maxLevel,85);
});
