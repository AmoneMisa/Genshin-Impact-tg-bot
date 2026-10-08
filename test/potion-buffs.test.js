import test from 'node:test';
import assert from 'node:assert/strict';
import potions from '../template/buffPotions.js';
import {applyPotionBuff,potionStatBonus,activePotionBuffs} from '../functions/game/player/potionBuffs.js';
import {useInventoryPotion} from '../miniapp/inventory.js';
import buyItem from '../functions/game/shop/shopSellItem.js';
import shop from '../template/shopTemplate.js';
import User from '../db/models/User.js';
import getEquipStatByName from '../functions/game/player/getters/getEquipStatByName.js';

const player=()=>({userName:'Tester',game:{effects:[],shopTimers:{},equipmentStats:{},gameClass:{stats:{name:'warrior',hp:100,maxHp:1000,mp:100,maxMp:400},skills:[]},inventory:{gold:30000,potions:{items:[]}}}});
test('buffs refresh independently, use trusted values and expire at 20 minutes',()=>{
 const s=player();
 applyPotionBuff(s,'might',1000);applyPotionBuff(s,'shield',1000);applyPotionBuff(s,'might',2000);
 assert.equal(activePotionBuffs(s,2000).length,2);
 s.game.effects[1].modifiers={attackMul:900};
 assert.equal(potionStatBonus(s,'attackMul',true,2000),1.15);
 assert.equal(potionStatBonus(s,'defenceMul',true,1201000),1);
 assert.equal(potionStatBonus(s,'attackMul',true,1201000),1.15);
 assert.equal(potionStatBonus(s,'attackMul',true,1202000),1);
 assert.equal(applyPotionBuff(s,'unknown',2000),null);
});
test('buff potions consume only their stack, work at full HP and reject dead or empty use',()=>{
 const s=player();s.game.gameClass.stats.hp=1000;
 s.game.inventory.potions.items=[{...potions[0],count:2}];
 assert.equal(useInventoryPotion(s,'0').resource,'buff');
 assert.equal(s.game.inventory.potions.items[0].count,1);
 assert.equal(s.game.gameClass.stats.hp,1000);
 assert.equal(potionStatBonus(s,'attackMul',true),1.15);
 s.game.gameClass.stats.hp=0;
 assert.equal(useInventoryPotion(s,'0').reason,'player_dead');
 assert.equal(s.game.inventory.potions.items[0].count,1);
 s.game.gameClass.stats.hp=100;s.game.inventory.potions.items[0].count=0;
 assert.equal(useInventoryPotion(s,'0').reason,'potion_empty');
});
test('all seven potion modifiers reach the combat stat getters',()=>{
 const s=player();
 for(const potion of potions)applyPotionBuff(s,potion.id);
 for(const potion of potions)for(const [stat,value] of Object.entries(potion.modifiers)){
  const multiply=stat.endsWith('Mul')||stat==='criticalDamage';
  assert.equal(getEquipStatByName(s,stat,multiply),value,stat);
 }
});
test('shop adds buff potion to existing inventories and charges once',async(t)=>{
 t.mock.method(User,'findOne',async()=>null);
 const s=player();const item=shop.find(i=>i.potionId==='might');
 await buyItem(s,item.command,item);
 assert.equal(s.game.inventory.gold,18000);
 assert.equal(s.game.inventory.potions.items[0].id,'might');
 assert.equal(s.game.inventory.potions.items[0].count,1);
 await buyItem(s,item.command,item);
 assert.equal(s.game.inventory.gold,18000);
 assert.equal(s.game.inventory.potions.items[0].count,1);
});
