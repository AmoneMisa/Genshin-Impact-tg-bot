import test from 'node:test';
import assert from 'node:assert/strict';
import { getCharacterState, characterEffects } from '../miniapp/character.js';
import { renderCharacterTab, characterSkillIcon } from '../webapp/character.js';
import {secondProfessionMarkArt} from '../template/professionMarkArt.js';
import luckShop from '../template/luckShop.js';
test('profession art uses race testimonies for second promotion and the resonance amulet for third',()=>{
 assert.equal(secondProfessionMarkArt('humanWizard'),'icon-etc_jewel_green_i00');
 assert.equal(secondProfessionMarkArt('elvenWizard'),'icon-etc_herb_green_i00');
 assert.equal(secondProfessionMarkArt('darkWizard'),'icon-etc_jewel_blue_i00');
 assert.equal(secondProfessionMarkArt('orcShaman'),'icon-etc_badge_gold_i00');
 assert.equal(secondProfessionMarkArt('scavenger'),'icon-etc_coins_gold_i00');
 assert.equal(luckShop.find(i=>i.id==='profession-mark-3').artIcon,'icon-etc_resonance_amulet_i00');
});

function session() {
  return {gender:'male', game:{
    stats:{lvl:24,currentExp:24813,needExp:12574}, equipmentStats:{},
    inventory:{sp:2147483647,gold:33000,crystals:1650,ironOre:165,equipment:{items:[]},materials:{}},
    gameClass:{stats:{name:'mage',translateName:'Маг',attack:100,defence:50,speed:60,
      hp:49773,maxHp:49773,mp:16211,maxMp:16211,cp:10589,maxCp:10589,
      accuracy:20,evasion:15,criticalChance:5,criticalDamage:1.5},skills:[]},
    effects:[],passives:{},clanPerks:{'376':2},
  }};
}
test('character snapshot exposes six base stats, six defenses and real clan bonuses',()=>{
  const dto=getCharacterState(session(),{user:{first_name:'Полное длинное имя'}});
  assert.equal(dto.name,'Полное длинное имя');
  assert.equal(dto.player.sp,2147483647);
  assert.deepEqual(dto.characteristics.map(stat=>stat.id),['STR','DEX','CON','INT','WIT','MEN']);
  assert.equal(dto.attributes.resist.length,6);
  assert.equal(dto.clanPassives[0].bonus,'+3%');
  assert.equal(dto.combat.find(stat=>stat.id==='pAtk').value,103);
  assert.equal(dto.combat.find(stat=>stat.id==='mAtk').value,100);
  assert.deepEqual(dto.combat.slice(0,4).map(stat=>stat.id),['pAtk','mAtk','pDef','mDef']);
  assert.equal(dto.equipment.items.length,0);
});

test('Status displays integer L2 critical rating capped at 500 without changing stored percent',()=>{
 for(const [percent,rating] of [[0,0],[5,50],[10,100],[13.89,138],[50,500],[75,500]]){
  const s=session();s.game.gameClass.stats.criticalChance=percent;
  const dto=getCharacterState(s),stat=dto.combat.find(s=>s.id==='criticalChance');
  assert.equal(stat.value,rating);assert.equal(stat.max,500);assert.equal(stat.unit,'rating');
  assert.equal(s.game.gameClass.stats.criticalChance,percent);
  const html=renderCharacterTab(dto,'stats');assert.match(html,new RegExp('Шанс крита</span><strong>'+rating+'</strong>'));
 }
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
  assert.equal((equipment.match(/data-character-slot=/g)||[]).length,16);
  assert.match(equipment,/data-character-slot="cloak"/);
  assert.doesNotMatch(equipment,/Слот свободен/);
  assert.doesNotMatch(equipment,/2[\s\u00a0]147/);
});
test('unknown player text is escaped and unavailable passive learning stays disabled',()=>{
  const data=getCharacterState(session());
  data.passives.passives=[{id:'<attack>',name:'<img src=x>',stat:'Защита',level:0,maxLevel:5,current:null,next:'+2%',cost:{sp:999,gold:10},needLvl:90,canLearn:false}];
  data.skills.book=[{id:1,name:'<img src=x>',description:'<script>bad()</script>',level:0,kind:'passive'}];
  const html=renderCharacterTab(data,'skills',{skillTab:'passive'});
  assert.match(html,/&lt;img src=x&gt;/);
  assert.match(html,/item-grid-cell unlearned/);
  assert.match(html,/&lt;script&gt;/);
  assert.doesNotMatch(html,/<img src=x>/);
});
test('skill and element artwork uses local reviewed assets',()=>{
  assert.match(characterSkillIcon('shield'),/\/art\/l2-extra\/icon-skill1040-32.webp/);
  assert.match(characterSkillIcon('lifestone'),/\/art\/l2-extra\/icon-skill3123-32.webp/);
  const data=getCharacterState(session());
  assert.match(renderCharacterTab(data,'stats'),/element-fire-128.webp/);
});
