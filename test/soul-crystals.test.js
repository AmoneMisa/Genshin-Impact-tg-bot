import test from 'node:test';
import assert from 'node:assert/strict';
import {findCatalogItem,instantiate} from '../functions/game/equipment/catalog.js';
import {getEquipmentState,performEquipmentAction} from '../miniapp/equipment.js';
import {saOptions,saInfo,installWeaponSa,removeWeaponSa,selectSoulCrystal,chargeSoulCrystal,absorbHuntSoul,absorbRaidSouls,exchangeSeals,soulCrystalState} from '../functions/game/equipment/soulCrystals.js';
import {addMaterial,getMaterialCount} from '../functions/game/player/materials.js';
import {getZones,getZone} from '../functions/game/hunt/huntMobs.js';
import {grantKillRewards} from '../functions/game/hunt/huntRewards.js';
import {SOUL_COL_PRICES,soulCrystalKey} from '../template/soulCrystalData.js';
import shop from '../template/shopTemplate.js';
import luck from '../template/luckShop.js';
import {buyLuckItem} from '../miniapp/luck.js';
import changePlayerGameClass from '../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../functions/game/player/updatePlayerStats.js';
import getMaxMp from '../functions/game/player/getters/getMaxMp.js';
import getStat from '../functions/game/player/getters/getEquipStatByName.js';
import {applySoulHit,tickSoulDots,applySoulSpell,soulShotCost} from '../functions/game/equipment/soulCrystalCombat.js';
import {advanceHunt} from '../functions/game/hunt/huntFight.js';
const hero=(level=80)=>{const s={userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:level,currentExp:0},inventory:{gold:5e6,crystals:0,ironOre:0,luckCoins:1000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};changePlayerGameClass(s,'mage');updatePlayerStats(s);return s;};
const weapon=(id='S:weapon:mace')=>instantiate(findCatalogItem(id),7);
const fund=(s,item,id='acumen')=>{const o=saOptions(item).find(o=>o.id===id),info=saInfo(s,item);assert.ok(o,id);addMaterial(s,soulCrystalKey(o.color,o.stage),1);addMaterial(s,info.gemKey,info.gems);return o;};
test('shops cover all three colors: 0–13 adena, 14–17 COL, with monotonic prices',()=>{
 const a=shop.filter(i=>i.category==='soul'),b=luck.filter(i=>i.group==='soul');assert.equal(a.length,42);assert.equal(b.length,12);
 for(const c of ['red','green','blue'])for(let stage=0;stage<=17;stage++){const row=(stage<=13?a:b).find(i=>(i.command||i.id)===`soul-${c}-${stage}`);assert.ok(row);assert.ok(stage<=13?row.repeatable:row.cost===SOUL_COL_PRICES[stage]);}
 const s=hero();assert.equal(buyLuckItem(s,'soul-red-17').ok,true);assert.equal(s.game.inventory.luckCoins,915);assert.equal(getMaterialCount(s,'soul_red_17'),1);
});
test('SA consumes its exact color/stage and gemstones, preserving identity and other upgrades',()=>{
 const s=hero(),item=weapon();s.game.inventory.equipment.items.push(item);item.augment={stat:'maxHp',value:50};item.attribute={element:'fire',value:150};const original=structuredClone(item),o=fund(s,item);
 assert.equal(installWeaponSa(s,item,o.id).ok,true);assert.equal(getMaterialCount(s,'soul_red_13'),0);assert.equal(item.enchant,7);assert.equal(item.uid,original.uid);assert.deepEqual(item.augment,original.augment);assert.deepEqual(item.attribute,original.attribute);assert.equal(saInfo(s,item).current.label,'Acumen');
 assert.equal(installWeaponSa(s,item,o.id).reason,'sa_exists');assert.equal(removeWeaponSa(s,item).ok,true);assert.equal(getMaterialCount(s,'soul_red_13'),0);
});
test('missing/wrong-color crystal, missing gemstones and gold never partially spend',()=>{
 for(const missing of ['crystal','gems','gold']){const s=hero(),item=weapon(),o=fund(s,item);if(missing==='crystal'){s.game.inventory.materials.soul_red_13=0;addMaterial(s,'soul_blue_13');}if(missing==='gems')s.game.inventory.materials.craft_gem_S=0;if(missing==='gold')s.game.inventory.gold=0;const before=JSON.stringify(s.game.inventory);assert.equal(installWeaponSa(s,item,o.id).ok,false);assert.equal(JSON.stringify(s.game.inventory),before);assert.ok(!item.sa);}
});
test('equipped snapshots block SA changes, stale item keys cannot repeat installation',()=>{
 const s=hero(),item=weapon();s.game.inventory.equipment.items.push(item);const o=fund(s,item);s.game.equipmentStats[item.slots[0]]=structuredClone(item);assert.equal(installWeaponSa(s,item,o.id).reason,'sa_equipped');s.game.equipmentStats={};const key=getEquipmentState(s).items[0].key;assert.equal(performEquipmentAction(s,key,'sa_install',{saId:o.id}).ok,true);assert.equal(performEquipmentAction(s,key,'sa_install',{saId:o.id}).reason,'stale_item');
});
test('Acumen and Mana Up affect the real combat getters once for a two-slot weapon',()=>{
 const s=hero(),item=weapon();fund(s,item);installWeaponSa(s,item,'acumen');s.game.equipmentStats={rightHand:structuredClone(item),leftHand:structuredClone(item)};assert.equal(getStat(s,'castingSpeedMul',true),1.15);
 s.game.equipmentStats={};removeWeaponSa(s,item);fund(s,item,'mana-up');s.game.equipmentStats[item.slots[0]]=item;const before=getMaxMp(s);s.game.equipmentStats={};installWeaponSa(s,item,'mana-up');s.game.equipmentStats[item.slots[0]]=item;assert.ok(Math.abs(getMaxMp(s)-Math.round(before*1.3))<=1);
});
test('normal absorption requires a selected crystal, correct monster, half HP and victory',()=>{
 const s=hero(40);addMaterial(s,'soul_red_0',2);assert.equal(selectSoulCrystal(s,'red',0).ok,true);const mob={mobId:'20584',hp:100,currentHp:51};assert.equal(chargeSoulCrystal(s,mob).reason,'soul_hp');mob.currentHp=50;assert.equal(chargeSoulCrystal(s,mob).ok,true);assert.equal(chargeSoulCrystal(s,mob).reason,'soul_already_charged');mob.currentHp=0;const r=absorbHuntSoul(s,mob,()=>0);assert.equal(r.stage,1);assert.equal(getMaterialCount(s,'soul_red_0'),1);assert.equal(getMaterialCount(s,'soul_red_1'),1);assert.equal(soulCrystalState(s).active.stage,1);
});
test('failed absorption and an incompatible monster do not spend crystals',()=>{
 const s=hero();addMaterial(s,'soul_blue_0');selectSoulCrystal(s,'blue',0);const mob={mobId:'20584',hp:100,currentHp:30};chargeSoulCrystal(s,mob);mob.currentHp=0;assert.equal(absorbHuntSoul(s,mob,()=>.99).outcome,'unchanged');assert.equal(getMaterialCount(s,'soul_blue_0'),1);assert.equal(chargeSoulCrystal(s,{mobId:'21100',hp:100,currentHp:10}).reason,'soul_wrong_mob');
});
test('low level, forged colors/stages and missing inventory are rejected',()=>{
 const s=hero(39);addMaterial(s,'soul_red_0');assert.equal(selectSoulCrystal(s,'red',0).reason,'soul_level');s.game.stats.lvl=40;for(const [c,l] of [['red','0'],['purple',0],['red',18],['red',-1]])assert.equal(selectSoulCrystal(s,c,l).ok,false);
});
test('raid absorption follows High Five and caps at 17',()=>{
 const a=hero(),b=hero();b.userId=2;for(const s of [a,b]){addMaterial(s,'soul_green_16');selectSoulCrystal(s,'green',16);}const result=absorbRaidSouls([a,b],'antharas',()=>0);assert.equal(result.length,2);for(const s of[a,b]){assert.equal(getMaterialCount(s,'soul_green_17'),1);assert.equal(getMaterialCount(s,'soul_green_16'),0);}assert.equal(absorbRaidSouls([a,b],'antharas',()=>0).length,0);
});
test('six distinct catacombs contain authentic mobs with seal-stone rewards',()=>{
 const zones=getZones().filter(z=>z.kind==='catacomb');assert.equal(zones.length,6);assert.equal(new Set(getZones().map(z=>z.id)).size,getZones().length);for(const z of zones){assert.equal(getZone(z.id),z);assert.ok(z.mobs.length>=3);assert.ok(z.mobs.some(m=>m.drops.some(d=>d.key.startsWith('seal_'))));const def=z.mobs.find(m=>m.drops.length),s=hero(def.level),r=grantKillRewards(s,{mobId:def.id,level:def.level,champion:null},def,{random:()=>0});assert.ok(r.items.some(i=>i.item.startsWith('seal_')));}
});
test('AA exchange uses 3/5/10 rates, supports partial exchange and rejects invalid input atomically',()=>{
 const s=hero();for(const c of ['blue','green','red'])addMaterial(s,'seal_'+c,10);assert.deepEqual(exchangeSeals(s,{blue:2,green:3,red:4}),{ok:true,aa:61});assert.equal(s.game.inventory.ancientAdena,61);assert.equal(getMaterialCount(s,'seal_blue'),8);for(const counts of [{red:7},{red:-1},{blue:1.5},{unknown:1},{red:0},null]){const before=JSON.stringify(s.game.inventory);assert.equal(exchangeSeals(s,counts).ok,false);assert.equal(JSON.stringify(s.game.inventory),before);}
});
test('a living target and repeated rewards cannot level the same crystal twice',()=>{
 const s=hero();addMaterial(s,'soul_red_0');selectSoulCrystal(s,'red',0);const mob={mobId:'20584',hp:100,currentHp:40};chargeSoulCrystal(s,mob);assert.equal(absorbHuntSoul(s,mob,()=>0),null);mob.currentHp=0;assert.equal(absorbHuntSoul(s,mob,()=>.99).outcome,'unchanged');assert.equal(absorbHuntSoul(s,mob,()=>0),null);assert.equal(getMaterialCount(s,'soul_red_0'),1);
});
test('critical procs require a critical hit, HP Drain works on a killing blow',()=>{
 const s=hero(),fists=weapon('S84:weapon:fists');fund(s,fists,'critical-stun');installWeaponSa(s,fists,'critical-stun');s.game.equipmentStats[fists.slots[0]]=fists;
 const target={hp:1000,currentHp:900,debuffs:[],listOfDamage:[]};assert.equal(applySoulHit(s,target,{critical:false,dealt:100,now:1000,random:()=>0}).effects.length,0);assert.equal(applySoulHit(s,target,{critical:true,dealt:100,now:1000,random:()=>0}).effects[0].kind,'stun');assert.equal(target.stunUntil,10000);
 s.game.equipmentStats={};const dagger=weapon('S84:weapon:dagger');fund(s,dagger,'hp-drain');installWeaponSa(s,dagger,'hp-drain');s.game.equipmentStats[dagger.slots[0]]=dagger;assert.equal(applySoulHit(s,{currentHp:0},{dealt:100}).drain,.04);
});
test('DoT kills in catacombs award loot once and credit the original damage dealer',()=>{
 const s=hero(40),zone=getZone('catacomb-heretic'),def=zone.mobs[0],now=10000;
 const mob={zone:zone.id,mobId:def.id,name:def.name,level:def.level,hp:100,currentHp:5,spawnedAt:now,nextAttackAt:now+10000,attackMs:3000,listOfDamage:[],soulDots:[{kind:'poison',userId:1,damage:5,nextAt:now+3000,until:now+10000}]};
 s.game.hunt={zone:zone.id,mob,kills:0,log:[],lastActionAt:now};assert.ok(advanceHunt(s,now+3000,()=>0).length);assert.equal(s.game.hunt.mob,null);assert.equal(s.game.hunt.kills,1);const inventory=JSON.stringify(s.game.inventory);advanceHunt(s,now+6000,()=>0);assert.equal(JSON.stringify(s.game.inventory),inventory);
 const body={hp:100,currentHp:2,minions:[{required:true,currentHp:10}],soulDots:[{damage:5,nextAt:0,until:3000,userId:1}],listOfDamage:[]};tickSoulDots(body,3000);assert.equal(body.currentHp,1);
});
test('magic-triggered buffs expire and Miser reduces the actual shot count',()=>{
 const s=hero(),staff=weapon('B:weapon:mace');fund(s,staff,'blessed-body');installWeaponSa(s,staff,'blessed-body');s.game.equipmentStats[staff.slots[0]]=staff;applySoulSpell(s,{isHeal:true},1000,()=>0);assert.equal(s.game.saBuffs[0].values.maxHpMul,1.3);assert.equal(s.game.saBuffs[0].until,1201000);
 s.game.equipmentStats={};const bow=weapon('C:weapon:bow');fund(s,bow,'miser');installWeaponSa(s,bow,'miser');s.game.equipmentStats[bow.slots[0]]=bow;assert.equal(soulShotCost(s,10,()=>0),7);assert.equal(soulShotCost(s,10,()=>.99),10);
});
test('stage 17 is consumed by original epic weapons, using the High Five top-weapon SA table',()=>{
 const s=hero(),item=weapon('epic-weapon:prism-sword');const o=fund(s,item,'focus');assert.equal(o.stage,17);assert.equal(o.color,'red');assert.equal(installWeaponSa(s,item,'focus').ok,true);assert.equal(getMaterialCount(s,'soul_red_17'),0);assert.ok(saInfo(s,item).options.find(o=>o.id==='health'&&o.color==='blue'));
});
