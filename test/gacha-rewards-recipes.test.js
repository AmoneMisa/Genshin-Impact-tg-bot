import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGachaReward,GACHA_REWARDS} from '../functions/game/equipment/gachaRewards.js';
import {getCatalog} from '../functions/game/equipment/catalog.js';
import craftItem,{learnRecipe,forgetRecipe,recipeCapacity,getRecipe,ensureCraft} from '../functions/game/equipment/craftItem.js';
import {rollGacha,resolveGacha,getGachaState} from '../miniapp/gacha.js';
const hero=()=>({game:{stats:{lvl:100},inventory:{gold:1e9,moonDew:1000,sp:0,ironOre:0,materials:{},equipment:{items:[]},gacha:{items:[]}},builds:{forge:{currentLvl:1}},craft:{level:100,exp:0,recipes:[]},gacha:[]}});
test('all reward boundaries give supplies; only the 1% shadow result is +7 and expires',()=>{
 assert.equal(GACHA_REWARDS.reduce((sum,r)=>sum+r.chance,0),100);
 for(const [roll,kind] of [[0,'resource'],[.349,'resource'],[.35,'consumable'],[.649,'consumable'],[.65,'piece'],[.869,'piece'],[.87,'recipe'],[.989,'recipe'],[.99,'shadow']]){
  const item=generateGachaReward(hero(),'S',{random:()=>roll,now:1000});
  if(kind==='shadow'){assert.equal(item.shadow,true);assert.equal(item.enchant,7);assert.equal(item.timed,true);assert.equal(item.noTrade,true);assert.equal(item.expiresAt,1000+3*86400000);}
  else{assert.equal(item.rewardKind,kind);assert.ok(item.rewardRef);assert.ok(item.amount>0);assert.equal(item.mainType,undefined);}
 }
});
test('supply reward is claimed once, never becomes wearable gear, and cannot be shattered',()=>{
 const s=hero();const roll=rollGacha(s,'newbie',{random:()=>0});assert.equal(roll.ok,true);
 assert.equal(resolveGacha(s,'break').ok,false);assert.ok(s.game.gachaTempItem);
 const ref=s.game.gachaTempItem.rewardRef,amount=s.game.gachaTempItem.amount;
 assert.equal(resolveGacha(s,'save').ok,true);assert.equal(s.game.inventory[ref],amount);
 assert.equal(s.game.inventory.equipment.items.length,0);assert.equal(resolveGacha(s,'save').ok,false);
});
test('an old unclaimed permanent item is converted to bound timed +7',()=>{
 const s=hero();s.game.gachaTempItem={...getCatalog().find(i=>i.grade==='S'),version:2};s.game.gachaTempType='royal';
 getGachaState(s);assert.equal(s.game.gachaTempItem.shadow,true);
 assert.equal(resolveGacha(s,'save').ok,true);assert.equal(s.game.inventory.equipment.items[0].enchant,7);
 assert.ok(s.game.inventory.equipment.items[0].expiresAt);
});
test('all crafts require a learned recipe; book cap grows 40 to 70 and forgetting closes craft',()=>{
 const s=hero();const ids=getCatalog().filter(i=>!i.epic&&getRecipe(i.id)).slice(0,71).map(i=>i.id);
 const free=getCatalog().find(i=>!i.epic&&getRecipe(i.id)?.learnPrice===0).id;
 assert.equal(craftItem(s,free).reason,'recipe_not_learned');
 assert.equal(recipeCapacity(s),40);
 for(const id of ids.slice(0,40))assert.equal(learnRecipe(s,id).ok,true);
 const before=structuredClone(s.game.inventory);assert.equal(learnRecipe(s,ids[40]).reason,'recipe_book_full');assert.deepEqual(s.game.inventory,before);
 assert.equal(forgetRecipe(s,ids[0]).ok,true);assert.equal(craftItem(s,ids[0]).reason,'recipe_not_learned');
 assert.equal(learnRecipe(s,ids[40]).ok,true);
 s.game.builds.forge.currentLvl=30;assert.equal(recipeCapacity(s),70);
 for(const id of ids.slice(41,71))assert.equal(learnRecipe(s,id).ok,true);
 assert.equal(ensureCraft(s).recipes.length,70);
 assert.equal(learnRecipe(s,ids[0]).reason,'recipe_book_full');
});
