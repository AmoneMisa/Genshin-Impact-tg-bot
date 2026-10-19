import exchanges from '../../../template/l2Unseal.js';
import {ISHUMA_UNSEAL} from '../../../template/graciaTravel.js';
import {nearIshuma} from '../world/npcServices.js';
import {getCatalog,instantiate,sourceUnsealDefinition} from './catalog.js';
import {itemRow} from '../hunt/lootTable.js';
import {getMaterialCount,spendMaterials} from '../player/materials.js';
import {hasInventoryRoom} from '../builds/palaceCapacity.js';

const normalize=name=>String(name).toLowerCase().replace(/^sealed /,'').replace(/[^a-z0-9]/g,'');
function definition(row){const base=row.name.replace(/\s*-\s*(Heavy Armor|Light Armor|Robe)$/i,'');return getCatalog().find(i=>i.mainType==='armor'&&normalize(i.name)===normalize(base)&&(!/Heavy Armor$/i.test(row.name)||i.kind==='heavy')&&(!/Light Armor$/i.test(row.name)||i.kind==='light')&&(!/Robe$/i.test(row.name)||i.kind==='robe'));}
export function unsealOptions(session,serviceNpc=null){return (serviceNpc==='ishuma'?ISHUMA_UNSEAL:exchanges).flatMap(row=>{
 const count=getMaterialCount(session,`l2_${row.source}`);if(!count)return [];
 const product=serviceNpc==='ishuma'?sourceUnsealDefinition(row.product):definition(row);if(!product)return [];
 return [{...row,id:`${row.source}:${row.product}`,sourceName:itemRow(row.source)?.name||`Sealed ${product.name}`,count,definition:product,canUnseal:(!serviceNpc||nearIshuma(session))&&Number(session.game.inventory.gold)>=row.gold&&Number(session.game.inventory.ancientAdena||0)>=row.aa&&hasInventoryRoom(session,count===1?0:1)}];
});}
export function unsealArmor(session,id,serviceNpc=null){
 if(serviceNpc&&serviceNpc!=='ishuma')return {ok:false,reason:'unknown_npc'};
 if(serviceNpc&&!nearIshuma(session))return {ok:false,reason:'npc_too_far'};
 const row=unsealOptions(session,serviceNpc).find(r=>r.id===id);if(!row)return {ok:false,reason:'no_sealed_armor'};
 const inv=session.game.inventory;
 if(Number(inv.gold)<row.gold)return {ok:false,reason:'not_enough_gold'};
 if(Number(inv.ancientAdena||0)<row.aa)return {ok:false,reason:'not_enough_aa'};
 if(!hasInventoryRoom(session,row.count===1?0:1))return {ok:false,reason:'inventory_full'};
 if(!spendMaterials(session,{[`l2_${row.source}`]:1}))return {ok:false,reason:'no_sealed_armor'};
 inv.gold-=row.gold;inv.ancientAdena=Number(inv.ancientAdena||0)-row.aa;
 const item=instantiate(row.definition);item.l2Id=row.product;
 inv.equipment.items.push(item);return {ok:true,action:'unseal',item};
}
