import test from 'node:test';
import assert from 'node:assert/strict';
import defaults from '../functions/getters/getLostFieldsInSession.js';
import {getCatalog,instantiate} from '../functions/game/equipment/catalog.js';
import {getEquipmentState,performEquipmentAction} from '../miniapp/equipment.js';
import {enchantItem} from '../functions/game/equipment/enchantItem.js';
import {enchantScroll,fitsEnchantScroll} from '../webapp/enchant.js';
import {unsealArmor,unsealOptions} from '../functions/game/equipment/unseal.js';
function session(){const s={userId:1,game:{}};defaults(s);s.game.stats.lvl=80;s.game.inventory.gold=1000000;return s;}
test('selected scroll enforces exact grade/type and spends only the selected stack',()=>{
 const s=session(),item=instantiate(getCatalog().find(i=>i.mainType==='weapon'&&i.grade==='D'));
 s.game.inventory.materials={scroll_D:2,blessed_D:1,bound_scroll_D:1};
 assert.equal(enchantItem(s,item,{scrollKey:'scroll_C'}).reason,'wrong_scroll');
 assert.equal(item.enchant,0);assert.equal(s.game.inventory.materials.scroll_D,2);
 assert.equal(enchantItem(s,item,{scrollKey:'bound_scroll_D'}).ok,true);
 assert.equal(s.game.inventory.materials.bound_scroll_D,0);assert.equal(s.game.inventory.materials.scroll_D,2);
 assert.equal(enchantItem(s,item,{scrollKey:'bound_scroll_D'}).reason,'no_scroll');
 assert.equal(s.game.inventory.materials.scroll_D,2);
 const dto=getEquipmentState({...s,game:{...s.game,inventory:{...s.game.inventory,equipment:{items:[item]}}}}).items[0];
 assert.equal(fitsEnchantScroll(dto,enchantScroll('scroll_C')),false);
 assert.equal(fitsEnchantScroll(dto,enchantScroll('safe_armor_D')),false);
 assert.equal(fitsEnchantScroll(dto,enchantScroll('safe_weapon_D')),true);
 assert.equal(enchantScroll('scroll_weapon_D'),null);
});
test('High Five unseal uses the real A-grade price, consumes sealed armor, produces wearable gear once',()=>{
 const s=session();s.game.inventory.materials={l2_5287:1};
 const row=unsealOptions(s).find(i=>i.product===365);assert.ok(row);assert.equal(row.gold,347250);
 const result=performEquipmentAction(s,row.id,'unseal');assert.equal(result.ok,true);
 assert.equal(s.game.inventory.gold,652750);assert.equal(s.game.inventory.materials.l2_5287,0);
 assert.equal(result.item.name,'Dark Crystal Breastplate');assert.equal(result.item.l2Id,365);
 assert.equal(unsealArmor(s,row.id).reason,'no_sealed_armor');assert.equal(s.game.inventory.equipment.items.length,1);
});
test('unseal refuses missing currency without consuming armor and rejects forged product IDs',()=>{
 const s=session();s.game.inventory.materials={l2_5287:1};s.game.inventory.gold=1;
 assert.equal(unsealArmor(s,'5287:365').reason,'not_enough_gold');assert.equal(s.game.inventory.materials.l2_5287,1);
 assert.equal(unsealArmor(s,'5287:999999').reason,'no_sealed_armor');assert.equal(s.game.inventory.gold,1);
});
