import {allRecipes} from './realRecipes.js';
import {itemRow,lootInfo} from '../hunt/lootTable.js';
import {materialInfo,addMaterial} from '../player/materials.js';
import generateRandomEquipment from './generateRandomEquipment.js';
import {DAY_MS} from './timedItems.js';

export const GACHA_REWARDS=Object.freeze([
 {kind:'resource',label:'Ресурсы',chance:35},
 {kind:'consumable',label:'Расходники',chance:30},
 {kind:'piece',label:'Куски',chance:22},
 {kind:'recipe',label:'Рецепты',chance:12},
 {kind:'shadow',label:'Теневое +7',chance:1},
]);
const tiers={noGrade:1,D:2,C:3,B:4,A:5,S:6,S80:7,S84:8};
const pick=(list,random)=>list[Math.min(list.length-1,Math.floor(random()*list.length))];
export function shadowGachaItem(item,now=Date.now()) {
 return {...item,shadow:true,bound:true,noTrade:true,tradeable:false,timed:true,enchant:7,expiresAt:now+3*DAY_MS};
}
export function generateGachaReward(session,grade,{random=Math.random,now=Date.now()}={}) {
 const tier=tiers[grade]||1;let cursor=0;const roll=random()*100;
 const kind=GACHA_REWARDS.find(p=>(cursor+=p.chance)>roll)?.kind||'shadow';
 if(kind==='shadow')return shadowGachaItem(generateRandomEquipment(session.game.stats.lvl,grade,{exact:true,forClass:session.game.gameClass?.stats?.name}),now);
 let ref,amount,label;
 if(kind==='resource'){
  ref=pick(['sp','moonDew','ironOre'],random);
  amount=ref==='sp'?tier*20:ref==='moonDew'?tier:2*tier;
  label={sp:'Очки навыков',moonDew:'Лунная роса',ironOre:'Железная руда'}[ref];
 }else if(kind==='consumable'){
  ref=pick(['scroll_escape',grade==='noGrade'?'scroll_resurrection':'soulshot_'+grade],random);
  amount=ref.startsWith('soulshot_')?20*tier:1;
 }else{
  const rows=allRecipes().filter(r=>{
   const product=itemRow(r.product);return product&&['Weapon','Armor'].includes(product.type)&& (product.grade==='NONE'?'noGrade':product.grade)===grade&&r.ingredients.some(([id])=>id>=2000&&id!==r.recipeItem);
  });
  const row=pick(rows.length?rows:allRecipes().filter(r=>r.level<=Math.min(9,tier+1)),random);
  ref=kind==='recipe'?lootInfo(row.recipeItem).key:lootInfo(row.ingredients.find(([id])=>id>=2000&&id!==row.recipeItem)?.[0]||1864).key;
  amount=kind==='recipe'?1:Math.max(1,Math.floor(tier/2));
 }
 return {version:2,rewardKind:kind,rewardRef:ref,amount,grade,translatedName:label||materialInfo(ref).name,name:ref,description:'×'+amount,stats:[]};
}
export function grantGachaReward(session,item) {
 if(item.rewardKind==='resource')session.game.inventory[item.rewardRef]=(Number(session.game.inventory[item.rewardRef])||0)+item.amount;
 else addMaterial(session,item.rewardRef,item.amount);
}
