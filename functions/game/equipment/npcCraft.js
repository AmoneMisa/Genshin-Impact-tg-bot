import recipes from '../../../template/l2NpcCraft.js';
import {lootInfo,itemRow} from '../hunt/lootTable.js';
import {getMaterialCount,addMaterial,spendMaterials} from '../player/materials.js';
import {hasInventoryRoom} from '../builds/palaceCapacity.js';

export function npcCraftRecipes(session){return recipes.map(recipe=>{
 const product=lootInfo(recipe.product),gold=recipe.ingredients.find(i=>i.id===57)?.count||0;
 const materials=recipe.ingredients.filter(i=>i.id!==57).map(i=>({key:lootInfo(i.id).key,name:itemRow(i.id)?.name||lootInfo(i.id).key,need:i.count,have:getMaterialCount(session,lootInfo(i.id).key),maintain:i.maintain}));
 // One exhausted ingredient stack can make room for the resulting material.
 const freesSlot=materials.some(m=>!m.maintain&&m.have===m.need);
 const room=getMaterialCount(session,product.key)>0||hasInventoryRoom(session,freesSlot?0:1);
 return {id:recipe.id,name:itemRow(recipe.product)?.name||product.key,grade:'noGrade',productKey:product.key,amount:recipe.amount,gold,successRate:1,mp:0,npcService:true,materials,canCraft:materials.every(m=>m.have>=m.need)&&Number(session?.game?.inventory?.gold||0)>=gold&&room};
});}

export function craftAtNpc(session,id){
 const recipe=npcCraftRecipes(session).find(r=>r.id===id);
 if(!recipe)return {ok:false,reason:'unknown_recipe'};
 if(recipe.materials.some(m=>m.have<m.need))return {ok:false,reason:'not_enough_materials'};
 const inventory=session.game.inventory;
 if(Number(inventory.gold||0)<recipe.gold)return {ok:false,reason:'not_enough_gold'};
 const freesSlot=recipe.materials.some(m=>!m.maintain&&m.have===m.need);
 if(!getMaterialCount(session,recipe.productKey)&&!hasInventoryRoom(session,freesSlot?0:1))return {ok:false,reason:'inventory_full'};
 const costs=Object.fromEntries(recipe.materials.filter(m=>!m.maintain).map(m=>[m.key,m.need]));
 if(!spendMaterials(session,costs))return {ok:false,reason:'not_enough_materials'};
 inventory.gold=Number(inventory.gold||0)-recipe.gold;
 addMaterial(session,recipe.productKey,recipe.amount);
 return {ok:true,success:true,action:'npc_craft',product:{key:recipe.productKey,name:recipe.name,amount:recipe.amount},paidGold:recipe.gold};
}
