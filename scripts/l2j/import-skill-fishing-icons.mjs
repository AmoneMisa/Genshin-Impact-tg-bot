// Original client art for the abilities and fishing items actually used by this project.
import fs from 'node:fs';
import path from 'node:path';
import skills from '../../template/classSkillsTemplate.js';
import fishing from '../../template/fishingData.js';
import {LS_SKILLS} from '../../functions/game/equipment/lifestoneSkills.js';
import {classFamily} from '../../functions/game/classes/classFamily.js';
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const [icons='C:/Users/kubai/Desktop/icons',items='.tmp/l2-high-five/items',definitions='.tmp/l2-high-five/all-skills']=process.argv.slice(2);
const files=new Map(walk(icons).filter(f=>f.endsWith('.png')).map(f=>[path.basename(f,'.png').toLowerCase(),f]));
const originals=new Map(),itemDefs=new Map(),assets=new Map(),references=[],skillArt={},fishingArt={};
for(const file of walk(definitions).filter(f=>f.endsWith('.xml')))for(const m of fs.readFileSync(file,'utf8').matchAll(/<skill id="(\d+)"[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/skill>/g))originals.set(+m[1],{id:+m[1],name:m[2],icon:m[3].match(/<icon>([^<]+)<\/icon>/)?.[1]});
for(const file of walk(items).filter(f=>f.endsWith('.xml')))for(const m of fs.readFileSync(file,'utf8').matchAll(/<item id="(\d+)"[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/item>/g))itemDefs.set(+m[1],{id:+m[1],name:m[2],icon:m[3].match(/<set name="icon" val="([^"]+)"/)?.[1]});
function art(row){
 const icon=row?.icon?.toLowerCase().replace(/^(branchsys2?)\.icon\./,'$1.');
 if(!files.has(icon))throw Error(`Missing original icon: ${JSON.stringify(row)}`);
 const key=icon.replaceAll('.','-');assets.set(key,{key,source:files.get(icon),original:icon});return key;
}
function ability(key,id,group,exact=false,name=key){const row=originals.get(id);skillArt[key]=art(row);references.push({key,name,group,referenceId:id,reference:row.name,original:row.icon,art:skillArt[key],exact});}
const buffs={might:1068,shield:1040,haste:1086,focus:1077,guidance:1240,'death-whisper':1242,'wind-walk':1204};
for(const [key,id] of Object.entries(buffs))ability(key,id,'Баффы',true);
const groups={
 3:'Тык палкой|Взмах меча|Удар секирой|Вожделение паладина',1177:'Выстрел из посоха|Удар скипетром',1340:'Грозовая стужа|Ледяной шип|Ледяные оковы',
 1418:'Лунная тень|Стена света|Ореол|Божественный щит',1218:'Сияние утренней звезды|Малое исцеление|Священное чудо|Небесное исцеление',
 1265:'Казнь святых|Священный огонь|Луч правосудия|Гнев небес|Кара небес|Приговор|Последний суд',
 56:'Точный выстрел|Прямо в яблочко|Выстрел в слабое место|Призрачная стрела|Выстрел судьбы',
 19:'Элементальная стрела|Град стрел|Тысяча стрел|Дождь комет',16:'Удар кинжалом|Подлый укол|Удар в спину|Казнь из тени|Поцелуй смерти',
 261:'Танец клинков|Тысяча порезов|Танец тысячи клинков|Вихрь теней|Затмение|Бесконечный танец|Рубка',
 260:'Дробящий удар|Громовой удар|Землетрясение|Гнев гор',1234:'Ярость вампира|Кровавая ярость|Удар возмездия|Пылающий меч|Гнев феникса|Похищение жизни|Пожирание|Жатва душ|Жатва мира|Бессмертие душ|Кровавая жатва',
 1068:'Клятва света|Охотничий азарт',110:'Несокрушимый щит|Крепость|Последний рубеж|Кровавая броня|Железная плоть|Несокрушимый|Вечная твердь',
 28:'Вызов|Неприступный бастион',1016:'Возрождение феникса|Огненное воскрешение',279:'Цепная молния|Разлом реальности',1467:'Метеоритный дождь|Звёздный шторм',
 1157:'Источник маны',1077:'Глаз сокола|Зрение сокола|Смертельная метка',101:'Бронебойная стрела|Ночной охотник|Тьма над целью|Ослепление|Дымовая завеса',922:'Тень',1062:'Неистовство|Боевой клич|Рёв войны',
};
const explicit=Object.fromEntries(Object.entries(groups).flatMap(([id,names])=>names.split('|').map(name=>[name,+id])));
const seen=new Set();
for(const [className,list] of Object.entries(skills))for(const skill of list){
 if(seen.has(skill.name))continue;seen.add(skill.name);
 const family=classFamily(className);
 const defaults={heal:1218,shield:110,restore:1157,debuff:1164,vampire:1234,buff:1068,multi_hit:['mage','priest'].includes(family)?1467:family==='archer'?19:261,magic_attack:1239,strong_attack:family==='archer'?56:family==='rogue'?16:3,execute:['mage','priest'].includes(family)?1234:16,common_attack:['mage','priest'].includes(family)?1177:family==='archer'?56:family==='rogue'?16:3};
 ability(skill.name,explicit[skill.name]||defaults[skill.effect]||3,'Навыки персонажа',false,skill.name);
}
// High Five augmentation icons are shared by kind, including project-specific effects.
const ls={passive_duel_might:3243,passive_magic_power:3241,passive_magic_barrier:3245,passive_focus:3249,passive_guidance:3248,passive_haste:3238,passive_vitality:3238,passive_clarity:3258,chance_critical_anger:3217,chance_death_blow:3223,chance_magic_burst:3216,active_might:3132,active_empower:3133,active_haste:3123,active_shield:3135,active_focus:3141};
for(const [key,id] of Object.entries(ls))ability(key,id,'Умения ЛС',false,LS_SKILLS.find(skill=>skill.id===key)?.name||key);
const named={'weapon-mastery':'Weapon Mastery','magic-mastery':'Weapon Mastery','heavy-armor-mastery':'Heavy Armor Mastery','robe-mastery':'Robe Mastery','light-armor-mastery':'Light Armor Mastery','boost-hp':'Boost HP','boost-mana':'Boost Mana','critical-power':'Critical Damage','critical-chance':'Critical Chance',accuracy:'Accuracy','quick-recovery':'Fast Spell Casting','healing-power':'Divine Lore',toughness:'Toughness','clan-might':'Clan Might','clan-shield':'Clan Shield','clan-vitality':'Clan Body','clan-precision':'Clan Guidance','clan-agility':'Clan Agility','clan-fury':'Critical Damage'};
for(const [key,name] of Object.entries(named)){
 const row=key==='magic-mastery'?originals.get(249):[...originals.values()].sort((a,b)=>a.id-b.id).find(r=>r.name===name&&r.icon&&files.has(r.icon.toLowerCase()));
 if(!row)throw Error('Missing reference skill '+name);ability(key,row.id,'Пассивные и клановые навыки');
}
for(const [key,id] of Object.entries({'fishing':1312,pumping:1313,reeling:1314,'fishing-expertise':1315}))ability(key,id,'Рыболовные навыки',true);
const statuses={reflect:3259,hp_regen:1044,rage:1062,resistance:1036,life:1044,damageUp:1068,critChanceUp:1077,critDamageUp:1242,guard:110,taunt:28,evade:1087,armorBreak:342,weaken:1164,stun:101,enrage:1062,armored:110,locked:1418,slow:1160,mute:1064,accuracyDown:412,poison:1168,bleed:96,addDamageToBoss:1068,addCritChanceToBoss:1077,addCritDamageToBoss:1242,damage:3,heal:1218,restore:1157,buff:1068,debuff:1164,utility:1312,lifestone:3123};
for(const [key,id] of Object.entries(statuses))ability(key,id,'Боевые эффекты');
const ids=new Set([...Object.keys(fishing.items).map(Number),...fishing.rods.map(r=>r.item),...Object.values(fishing.shots),fishing.proofItem,...fishing.recipes.map(r=>r[0]),...Object.values(fishing.capsules).flat().map(r=>r[0])]);
const fishingReferences=[];
for(const id of ids){const row=itemDefs.get(id);const key='l2_'+id;fishingArt[key]=art(row);fishingReferences.push({...row,key,art:fishingArt[key]});}
fs.mkdirSync('.tmp',{recursive:true});
fs.writeFileSync('.tmp/l2-skill-fishing-plan.json',JSON.stringify({assets:[...assets.values()],skillArt,fishingArt,references,fishingReferences},null,2));
console.log(`${seen.size} class skills, ${Object.keys(ls).length} augmentation skills, ${ids.size} fishing items; ${assets.size} original images.`);

