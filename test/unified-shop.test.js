import test from 'node:test';
import assert from 'node:assert/strict';
import {getShopState,buyShopItem} from '../miniapp/shop.js';
import {getLuckShopState} from '../miniapp/luck.js';
import {getClassQuestView,useProfessionMark,payQuestStep,promoteClass} from '../functions/game/classes/classQuests.js';
import {createMiniAppFeatures} from '../miniapp/state.js';
import {l2IconUrl} from '../webapp/art/l2-icon-art.js';
import {applyPotionBuff,potionStatBonus,activePotionBuffs} from '../functions/game/player/potionBuffs.js';
import {queuePotionHealing,settlePotionHealing} from '../functions/game/player/potionHealing.js';
import {enchantItem,enchantScrollCount,safeTypedKey} from '../functions/game/equipment/enchantItem.js';
import fs from 'node:fs';

const hero=()=>({game:{stats:{lvl:84},gameClass:{stats:{name:'humanWizard',hp:100,maxHp:1000},skills:[]},inventory:{gold:1000000,moonDew:1000,luckCoins:1000,equipment:{items:[]},potions:{items:[]}}}});

test('all CoL offers belong to the common shop; passes and marks are quest goods with original client art',async()=>{
 const s=hero(),shop=getShopState(s),offers=getLuckShopState(s).items;
 assert.equal(createMiniAppFeatures({chatId:1,userId:2}).some(i=>i.id==='luckShop'),false);
 for(const offer of offers)assert.ok(shop.items.some(i=>i.command==='col:'+offer.id && i.currency==='luckCoins'));
 const quests=shop.items.filter(i=>i.category==='quest');assert.equal(quests.length,7);
 for(const item of quests){const url=l2IconUrl(item.artIcon);assert.ok(url,item.name);assert.ok(fs.existsSync('webapp'+url));}
 const result=await buyShopItem(s,'col:pass-baium');assert.equal(result.ok,true);assert.equal(s.game.academy.passes.baium,1);assert.equal(s.game.inventory.luckCoins,955);
 for(const item of shop.items.filter(i=>i.artMaterial?.startsWith('lifestone_'))){assert.match(item.name,/\d+ ур\./);assert.doesNotMatch(item.message,/шанс/);}
});

test('profession marks replace objectives once, respect class and level, retain mentor payment',async()=>{
 const s=hero();s.game.stats.lvl=40;
 const to=getClassQuestView(s).promotions[0].to;
 assert.equal((await buyShopItem(s,'col:profession-mark-2')).ok,true);
 assert.equal((await buyShopItem(s,'col:profession-mark-2')).reason,'already_full');
 assert.equal(useProfessionMark(s,'humanWizard').ok,false);
 s.game.stats.lvl=39;assert.equal(useProfessionMark(s,to).reason,'level_too_low');
 assert.equal(s.game.classQuest.marks[3],1);
 s.game.stats.lvl=40;assert.equal(useProfessionMark(s,to).ok,true);
 assert.equal(useProfessionMark(s,to).reason,'no_mark');
 const quest=getClassQuestView(s).promotions.find(p=>p.to===to);
 assert.ok(quest.steps.filter(p=>!p.manual).every(p=>p.done));assert.ok(quest.steps.some(p=>p.manual && !p.done));
 assert.equal(promoteClass(s,to).reason,'quest_not_complete');
 assert.equal(payQuestStep(s).ok,true);assert.equal(promoteClass(s,to).ok,true);
});

test('third profession mark is available only at 76 and is consumed by the corresponding promotion',async()=>{
 const s=hero();s.game.gameClass.stats.name='necromancer';s.game.stats.lvl=75;
 assert.equal((await buyShopItem(s,'col:profession-mark-3')).reason,'level_too_low');assert.equal(s.game.inventory.luckCoins,1000);
 s.game.stats.lvl=76;assert.equal((await buyShopItem(s,'col:profession-mark-3')).ok,true);
 const to=getClassQuestView(s).promotions[0].to;assert.equal(useProfessionMark(s,to).ok,true);assert.equal(s.game.classQuest.marks[4],0);
});

test('bundled buffs last two hours, affect their attack channel and never stack with legacy potion buffs',()=>{
 const s=hero(),now=10000;
 applyPotionBuff(s,'might',now);applyPotionBuff(s,'warrior-buff',now);
 assert.equal(activePotionBuffs(s,now).length,1);
 assert.equal(potionStatBonus(s,'attackMul',true,now,'physical'),1.15);
 assert.equal(potionStatBonus(s,'attackMul',true,now,'magic'),1);
 applyPotionBuff(s,'mage-buff',now);applyPotionBuff(s,'might',now);
 assert.equal(activePotionBuffs(s,now).length,1);
 assert.equal(potionStatBonus(s,'attackMul',true,now,'magic'),1.75);
 assert.equal(potionStatBonus(s,'attackMul',true,now,'physical'),1);
 assert.equal(activePotionBuffs(s,now+7200000).length,0);
 assert.ok(s.game.effects.every(e=>!e.l2SkillId));
});

test('HP healing is paid in one-second ticks over 15 seconds, survives a restart and cannot revive',()=>{
 const s=hero(),now=10000;queuePotionHealing(s,300,now);
 assert.equal(s.game.gameClass.stats.hp,100);
 assert.equal(settlePotionHealing(s,now+999,1000),false);
 settlePotionHealing(s,now+1000,1000);assert.equal(s.game.gameClass.stats.hp,120);
 const restarted=structuredClone(s);settlePotionHealing(restarted,now+5000,1000);assert.equal(restarted.game.gameClass.stats.hp,200);
 settlePotionHealing(restarted,now+15000,1000);assert.equal(restarted.game.gameClass.stats.hp,400);assert.equal(restarted.game.hpPotion,undefined);
 assert.equal(settlePotionHealing(restarted,now+16000,1000),false);
 queuePotionHealing(s,300,now);s.game.gameClass.stats.hp=0;settlePotionHealing(s,now+15000,1000);assert.equal(s.game.gameClass.stats.hp,0);assert.equal(s.game.hpPotion,undefined);
});

test('S scrolls serve S80/S84 too; previously owned scrolls remain usable, +4 is already risky',t=>{
 t.mock.method(Math,'random',()=>.99);
 for(const grade of ['S','S80','S84']){
   const s=hero(),item={grade,mainType:'weapon',enchant:7};
   s.game.inventory.materials={[`safe_weapon_${grade}`]:1};
   assert.equal(safeTypedKey(item),'safe_weapon_S');assert.equal(enchantScrollCount(s,'safe_weapon_S'),1);
   assert.equal(enchantItem(s,item,{scroll:'safeTyped'}).outcome,'kept');assert.equal(item.enchant,7);
 }
 const s=hero(),item={grade:'S84',mainType:'armor',kind:'robe',category:'fullBody',enchant:3};
 s.game.inventory.equipment.items.push(item);s.game.inventory.materials={scroll_S:1};
 assert.equal(enchantItem(s,item).outcome,'broken');
});
