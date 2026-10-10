// Build the published allowlist from the user's local client icons and High Five item definitions.
// node scripts/l2j/import-local-icons.mjs <icons folder> <datapack items folder>
import fs from 'node:fs';
import path from 'node:path';
import ITEMS from '../../template/l2Items.js';
import MERCHANT from '../../template/merchantData.js';
import {getCatalog} from '../../functions/game/equipment/catalog.js';
import {lootInfo} from '../../functions/game/hunt/lootTable.js';
const [source, definitions]=process.argv.slice(2);
if(!source||!definitions)throw Error('Supply local icon and item XML folders');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=new Map(walk(source).filter(f=>f.endsWith('.png')).map(f=>[path.basename(f,'.png').toLowerCase(),f]));
const byId=new Map(),byName=new Map();
for(const file of walk(definitions).filter(f=>f.endsWith('.xml'))){
 for(const m of fs.readFileSync(file,'utf8').matchAll(/<item id="(\d+)" type="(\w+)" name="([^"]+)">([\s\S]*?)<\/item>/g)){
  const field=name=>m[4].match(new RegExp(`<set name="${name}" val="([^"]*)"`))?.[1];
  const row={id:+m[1],type:m[2],name:m[3].replaceAll('&apos;',"'").replaceAll('&amp;','&'),icon:field('icon')?.toLowerCase(),grade:field('crystal_type')||'NONE',slot:field('bodypart'),armor:field('armor_type')};
  byId.set(row.id,row);if(!byName.has(row.name.toLowerCase()))byName.set(row.name.toLowerCase(),row);
 }
}
const assets={},materials={},catalog={},categories={},ui={},missing=[];
function add(icon){
 icon=icon?.toLowerCase().replace(/^(branchsys2?)\.icon\./,'$1.');if(!icon||!files.has(icon)){if(icon)missing.push(icon);return null;}
 const key=icon.replaceAll('.','-');assets[key]={key,source:files.get(icon),original:path.basename(files.get(icon)),sizes:[128,256,512]};return key;
}
function named(name){return add(byName.get(name.toLowerCase())?.icon);}
function set(key,icon){const value=add(icon);if(value)materials[key]=value;}
for(const id of new Set([...Object.keys(ITEMS),...Object.keys(MERCHANT.items)])){
 const row=byId.get(+id);if(!row)continue;
 const value=add(row.icon);if(value){materials['l2_'+id]=value;const info=lootInfo(id);if(info.key!=='l2_'+id)materials[info.key]=value;}
}
const grades=['noGrade','D','C','B','A','S','S80','S84'],colours=['white','blue','green','red','silver','gold','gold','gold'];
for(const [i,grade] of grades.entries()){
 const g=grade==='S80'||grade==='S84'?'S':grade==='noGrade'?'D':grade,n=Math.max(1,Math.min(5,i));
 set('scroll_'+grade,`icon.etc_scroll_of_enchant_weapon_i0${n}`);
 set('blessed_'+grade,`icon.etc_blessed_scrl_of_ench_wp_${g.toLowerCase()}_i0${n}`);
 for(const [type,short] of [['weapon','wp'],['armor','am']]){
  set(`blessed_${type}_${grade}`,`icon.etc_blessed_scrl_of_ench_${short}_${g.toLowerCase()}_i0${n}`);
  set(`safe_${type}_${grade}`,g==='S'?`branchsys.br_ancient_cry_of_ench_${short}_s_i00`:`br_cashtex.br_cash_cry_of_ench_${short}_${['A','B'].includes(g)?g.toLowerCase():'b'}_i00`);
 }
 set('crystal_'+grade,`icon.etc_crystal_${colours[i]}_i00`);
 const gems={D:'crystal_ball_silver',C:'crystal_ball_green',B:'bead_green',A:'bead_red',S:'bead_silver'};
 set('craft_gem_'+grade,`icon.etc_${gems[g]}_i00`);
 for(const [family,original] of Object.entries({binder:'branch_gold',leather:'leather',fiber:'skein_white'}))set(`craft_${family}_${grade}`,`icon.etc_${original}_i00`);
 for(const [quality,original] of Object.entries({normal:'general',mid:'special',high:'rare',top:'unique'})){
  const level=Math.max(0,Math.min(3,i-2));
  set(`lifestone_${quality==='normal'?'':quality+'_'}${grade}`,`icon.etc_mineral_${original}_i0${level}`);
 }
 for(const [kind,base,suffix] of [['soulshot','spirit_bullet','00'],['spiritshot','spell_shot','00'],['blessed_spiritshot','spell_shot','01']])set(`${kind}_${grade}`,`icon.etc_${base}_${colours[i]}_i${suffix}`);
}
for(const [colour,index] of Object.entries({red:0,green:2,blue:1}))for(let stage=0;stage<=17;stage++)set(`soul_${colour}_${stage}`,`icon.etc_soul_stone_i0${index}`);
for(const [colour,element] of Object.entries({red:'fire',green:'wind',blue:'water'}))set('seal_'+colour,`icon.etc_${element}_rune_i00`);
for(const [element,colour] of Object.entries({fire:'red',water:'blue',wind:'green',earth:'gold',holy:'silver',dark:'white'}))for(const tier of ['stone','crystal','jewel'])set(`attr_${tier}_${element}`,tier==='jewel'?`icon.etc_jewel_${colour}_i00`:`icon.etc_${element==='dark'?'unholy':element}_${tier}_i00`);
for(const [egg,original] of Object.entries({wyvern:'etc_basilisk_egg_i00',dragon:'etc_dragon_egg_i00',ancient:'etc_dragon_egg_i05'}))set('egg_'+egg,'icon.'+original);
set('gold','icon.etc_adena_i00');set('aa','icon.etc_ancient_adena_i00');
for(const item of getCatalog().filter(item=>item.mainType==='jewelry')){
 const value=named(item.name);if(value)catalog[item.name.toLowerCase()]=value;
}
for(const [name,original] of Object.entries({'Magic Necklace':'accessary_blessed_necklace_i00','Necklace of Binding':'accessary_necklace_of_binding_i00','Dynasty Earring':'accessary_dynasty_earing_i00',"Zaken's Earring":'accessory_earring_of_zaken_i00',"Frintezza's Necklace":'accessory_necklace_of_frintessa_i00'})){
 const value=add('icon.'+original);if(value)catalog[name.toLowerCase()]=value;
}
for(const [key,original] of Object.entries({coin:'etc_adena_i00',gem:'etc_crystal_gold_i00',party:'action011','loot-finders':'action008','loot-random':'etc_dice_a_i00','loot-turn':'action012',leader:'accessory_crown_i00','merchant-weapons':'weapon_small_sword_i00','merchant-armor':'armor_t88_u_i00','merchant-jewelry':'accessary_blessed_ring_i00','merchant-alchemist':'etc_recipe_white_i00','merchant-mammon':'etc_ancient_adena_i00'}))ui[key]=add('icon.'+original);
for(const [key,original] of Object.entries({'potion-hp-little':'etc_potion_red_i00','potion-hp-small':'etc_potion_scarlet_i00','potion-hp-medium':'etc_potion_scarlet_i00','potion-mp-little':'etc_lesser_potion_blue_i00','potion-mp-small':'etc_potion_blue_i00',might:'etc_potion_red_i00',shield:'etc_potion_blue_i00',haste:'etc_potion_green_i00',focus:'etc_potion_yellow_i00','death-whisper':'etc_potion_purpel_i00',guidance:'etc_potion_clear_i00','wind-walk':'etc_potion_green_i00'}))set(key.startsWith('potion-')?key:'potion-'+key,'icon.'+original);
set('potion-hp-elixir','br_cashtex.br_cash_elixir_of_life_a_i00');
for(const grade of ['A','S'])for(const [kind,name] of Object.entries({life:'Life',spirit:'Mental Strength',cp:'CP'})){
 const original=named(`Elixir of ${name} (${grade}-Grade)`);if(original)materials[`elixir-${kind}-${grade}`]=original;
}
for(const [kind,original] of Object.entries({gold:'etc_adena_i00',full:'weapon_small_sword_i00',piece:'etc_plate_silver_i00',recipe:'etc_recipe_white_i00',scroll:'etc_scroll_of_enchant_weapon_i05',lifestone:'etc_mineral_general_i03',attribute:'etc_fire_stone_i00',seal:'etc_water_rune_i00',dye:'etc_str_hena_i00',crystal:'etc_crystal_gold_i00',material:'etc_lump_gray_i00',consumable:'etc_potion_scarlet_i00',herb:'etc_herb_red_i00',other:'etc_adena_i00'}))categories[kind]=add('icon.'+original);
fs.mkdirSync('.tmp',{recursive:true});
const identities=Object.fromEntries(getCatalog().filter(item=>item.mainType==='jewelry'&&catalog[item.name.toLowerCase()]).map(item=>[[item.name,item.grade,item.kind,item.category].map(v=>String(v||'').trim().toLowerCase()).join('|'),catalog[item.name.toLowerCase()]]));
const equipment={},equipmentReferences=[];
const clean=name=>name.toLowerCase().replace(/^sealed /,'').replace(/[^a-z0-9]/g,'');
const slots={helmet:'head',gloves:'gloves',boots:'feet',greaves:'legs',body:'chest',fullBody:'fullarmor',bigShield:'lhand',smallShield:'lhand',sigill:'lhand'};
const aliases={'Karmian Circlet':['Generic Circlet','armor_circlet_i00'],'Chain Gauntlets':['Chain Gloves','armor_t48_g_i00'],'Karmian Robe':['Karmian Tunic','armor_t53_u_i00'],'Sarnga':['Sarnga','weapon_sarnga_i00'],'Vesper Sheutjeh':['Vesper Schutze','weapon_vesper_schutze_i00'],'Vesper Magic Circlet':['Vesper Circlet','armor_circlet_i00'],'Vesper Gauntlets':['Vesper Gauntlet','armor_t94_g_i00'],'Vesper Magic Gloves':['Vesper Gloves','armor_t96_g_i00'],'Vesper Magic Boots':['Vesper Shoes','armor_t96_b_i00'],'Vesper Leather Armor':['Vesper Leather Breastplate','armor_t95_u_i00'],'Vesper Magic Robe':['Vesper Tunic','armor_t96_u_i00']};
const equivalentNames={
 'Strengthened Long Bow':'Strengthening Long Bow', 'Demon Dagger':"Demon's Dagger",
 'Devotion Robe':'Tunic of Devotion','Wooden Armor':'Wooden Breastplate',
 'Manticore Skin Armor':'Manticore Skin Shirt','Elven Mithril Robe':'Elven Mithril Tunic',
 'Avadon Helmet':'Avadon Circlet','Avadon Leather Helmet':'Avadon Circlet - Light Armor Use',
 'Avadon Magic Circlet':'Avadon Circlet - Robe','Avadon Gauntlets':'Avadon Gloves - Heavy Armor',
 'Avadon Leather Gloves':'Avadon Gloves - Light Armor','Avadon Magic Gloves':'Avadon Gloves - Robe',
 'Avadon Leather Boots':'Avadon Boots - Light Armor','Avadon Magic Boots':'Avadon Boots - Robe',
 'Avadon Magic Robe':'Avadon Robe','Tallum Leather Helmet':'Tallum Helmet - Light Armor Use',
 'Majestic Magic Circlet':'Majestic Circlet - Robe','Dark Crystal Gauntlets':'Dark Crystal Gloves - Heavy Armor',
 'Tallum Leather Gloves':'Tallum Gloves - Light Armor','Majestic Magic Gloves':'Majestic Gauntlets - Robe',
 'Tallum Leather Boots':'Tallum Boots - Light Armor','Majestic Magic Boots':'Majestic Boots - Robe',
 'Majestic Magic Robe':'Majestic Robe','Dynasty Magic Circlet':'Dynasty Circlet',
 'Dynasty Magic Gloves':'Dynasty Gloves','Dynasty Magic Boots':'Dynasty Shoes','Dynasty Magic Robe':'Dynasty Tunic',
 'Elven Mithril Gloves':'Elven Mithril Gloves of Fortune - 90-day limited period',
};
for(const [name,reference] of Object.entries(equivalentNames)){
 const row=byName.get(reference.toLowerCase());if(row)aliases[name]=[row.name,row.icon.replace(/^icon\./,'')];
}
// Project-only low-grade parts use a matching client silhouette, with the reference recorded below.
for(const [name,reference,icon] of [
 ['Wooden Crossbow','Crossbow','weapon_rudecutter_crossbow_i00'],
 ['Strengthened Long Bow','Strengthening Long Bow','weapon_strengthening_long_bow_i00'],
 ['Devotion Circlet','Generic Circlet','armor_circlet_i00'],
 ['Elven Mithril Circlet','Generic Circlet','armor_circlet_i00'],
 ['Manticore Skin Helmet','Leather Helmet','armor_leather_helmet_i00'],
 ['Drake Leather Helmet','Leather Helmet','armor_leather_helmet_i00'],
 ...['Bronze','Wooden','Devotion'].flatMap(family=>[
  [family+(family==='Bronze'?' Gauntlets':' Gloves'),'Gloves','armor_t06_g_i00'],
  [family+' Boots','Leather Boots','armor_t09_b_i00'],
 ]),
])aliases[name]=[reference,icon];
for(const item of getCatalog().filter(item=>item.mainType!=='jewelry')){
 let row=byName.get(item.name.toLowerCase())||[...byId.values()].find(row=>clean(row.name)===clean(item.name));
 if(!row&&aliases[item.name])row={name:aliases[item.name][0],icon:'icon.'+aliases[item.name][1]};
 if(!row&&item.mainType!=='weapon'){
  const grade=item.grade==='noGrade'?'NONE':item.grade;
  row=[...byId.values()].find(row=>row.type==='Armor'&&row.grade===grade&&row.slot===slots[item.category||item.kind]&&(!['heavy','light','robe'].includes(item.kind)||row.armor==={heavy:'HEAVY',light:'LIGHT',robe:'MAGIC'}[item.kind])&&files.has(row.icon));
 }
 const art=add(row?.icon);if(!art)continue;
 equipment[[item.name,item.grade,item.kind,item.category].map(v=>String(v||'').trim().toLowerCase()).join('|')]=art;
 equipmentReferences.push({id:item.id,name:item.name,reference:row.name,art,exact:clean(row.name)===clean(item.name)});
}
const highlights=Object.fromEntries([...byName.values()].filter(row=>row.name==='Blank Scroll'||row.name==="Mammon's Varnish Enhancer"||/^SP Scroll/.test(row.name)).map(row=>[row.name,add(row.icon)]).filter(([,art])=>art));
fs.writeFileSync('.tmp/l2-icon-import-plan.json',JSON.stringify({assets:Object.values(assets),materials,catalog,identities,equipment,equipmentReferences,categories,ui,highlights,missing:[...new Set(missing)]},null,2)+'\n');
fs.writeFileSync('art-source/l2-redraw/missing-equipment.json',JSON.stringify(equipmentReferences,null,2)+'\n');
console.log('Catalogue equipment supplied: '+equipmentReferences.length);
console.log('Unmatched equipment: '+getCatalog().filter(item=>item.mainType!=='jewelry'&&!equipmentReferences.some(row=>row.id===item.id)).map(item=>item.name).join(', '));
console.log(JSON.stringify({assets:Object.keys(assets).length,materials:Object.keys(materials).length,jewelry:Object.keys(catalog).length,missing:[...new Set(missing)]}));
