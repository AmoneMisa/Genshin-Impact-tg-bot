import test from 'node:test';
import assert from 'node:assert/strict';
import { getCharacterState, characterEffects } from '../miniapp/character.js';
import { renderCharacterTab, characterSkillIcon } from '../webapp/character.js';

function session() {
  return {gender:'male', game:{
    stats:{lvl:24,currentExp:24813,needExp:12574}, equipmentStats:{},
    inventory:{sp:2147483647,gold:33000,crystals:1650,ironOre:165,equipment:{items:[]},materials:{}},
    gameClass:{stats:{name:'mage',translateName:'Маг',attack:100,defence:50,speed:60,
      hp:49773,maxHp:49773,mp:16211,maxMp:16211,cp:10589,maxCp:10589,
      accuracy:20,evasion:15,criticalChance:5,criticalDamage:1.5},skills:[]},
    effects:[],passives:{},clanPerks:{'clan-might':2},
  }};
}
test('character snapshot exposes six base stats, six defenses and real clan bonuses',()=>{
  const dto=getCharacterState(session(),{user:{first_name:'Полное длинное имя'}});
  assert.equal(dto.name,'Полное длинное имя');
  assert.equal(dto.player.sp,2147483647);
  assert.deepEqual(dto.characteristics.map(stat=>stat.id),['STR','DEX','CON','INT','WIT','MEN']);
  assert.equal(dto.attributes.resist.length,6);
  assert.equal(dto.clanPassives[0].bonus,'+2%');
  assert.equal(dto.combat.find(stat=>stat.id==='attack').value,102);
  assert.equal(dto.equipment.items.length,0);
});
test('effects discard expired, exhausted and zero shields, preserving timed and charge semantics',()=>{
  const s=session(),now=10000;
  s.game.effects=[{name:'guard',amount:.2,until:20000},{name:'addDamageToBoss',amount:75,count:3},
    {potionId:'might',until:9000},{name:'addDamageToBoss',count:0},{name:'shield',value:0},
    {name:'slow',kind:'debuff',until:20000}];
  const effects=characterEffects(s,now);
  assert.equal(effects.length,3);
  assert.equal(effects[1].charges,3);
  assert.equal(effects[2].kind,'debuff');
});
test('numeric SP belongs to character stats and every equipment slot is a selectable target',()=>{
  const data=getCharacterState(session(),{user:{first_name:'Игрок'}});
  const stats=renderCharacterTab(data,'stats');
  assert.match(stats,/2[\s\u00a0]147[\s\u00a0]483[\s\u00a0]647/);
  const equipment=renderCharacterTab(data,'equipment');
  assert.equal((equipment.match(/data-character-slot=/g)||[]).length,13);
  assert.match(equipment,/data-character-slot="cloak"/);
  assert.match(equipment,/Слот свободен/);
  assert.doesNotMatch(equipment,/2[\s\u00a0]147/);
});
test('unknown player text is escaped and unavailable passive learning stays disabled',()=>{
  const data=getCharacterState(session());
  data.passives.passives=[{id:'<attack>',name:'<img src=x>',stat:'Защита',level:0,maxLevel:5,current:null,next:'+2%',cost:{sp:999,gold:10},needLvl:90,canLearn:false}];
  const html=renderCharacterTab(data,'skills');
  assert.match(html,/&lt;img src=x&gt;/);
  assert.match(html,/data-passive-id="&lt;attack&gt;" disabled/);
  assert.doesNotMatch(html,/<img src=x>/);
});
test('skill and element artwork uses local reviewed assets',()=>{
  assert.match(characterSkillIcon('shield'),/\/art\/ui\/v1\/shield-128.webp/);
  assert.match(characterSkillIcon('lifestone'),/\/art\/icons\/lifestone-128.webp/);
  const data=getCharacterState(session());
  assert.match(renderCharacterTab(data,'stats'),/element-fire-128.webp/);
});