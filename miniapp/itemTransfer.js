import {sellableItems} from './auction.js';
import {materialInfo} from '../functions/game/player/materials.js';
import {equipmentTransferBlocked} from '../functions/game/equipment/tradeRestrictions.js';
import {inventorySlotsUsed} from '../functions/game/builds/palaceCapacity.js';
import {migrateCurrencyWallet} from '../functions/game/player/currencyMigration.js';
/** Options of a transfer into an inventory: it holds `capacity` slots (the palace level sets it). */
export const intoInventory=capacity=>({limit:capacity,slots:inventorySlotsUsed});
export const STORAGE_SLOTS=250;
export const CURRENCIES={gold:'Адена',moonDew:'Лунная роса',ironOre:'Железная руда'};
export const potionKey=p=>p?.id||`${p?.type}:${p?.bottleType}:${p?.power}:${p?.size}`;
const validCount=n=>Number.isSafeInteger(n)&&n>0;
const allowed=item=>item&&!item.isUsed&&!equipmentTransferBlocked(item);
export function stockRows(stock={}){
 migrateCurrencyWallet(stock);
 const rows=sellableItems({game:{inventory:{...stock,materials:{...stock.materials}}}}).filter(row=>row.kind!=='equipment'||allowed(stock.equipment.items.find(i=>i.uid===row.ref)));
 return [...Object.entries(CURRENCIES).filter(([key])=>validCount(stock[key])).map(([key,title])=>({kind:'currency',ref:key,materialKey:key,title,count:stock[key]})),...rows];
}
export function storageSlots(stock){return stockRows(stock).length;}
export function validateStock(stock,{kind,ref,count}){
 if(['__proto__','constructor','prototype'].includes(ref))return {ok:false,reason:'invalid_kind'};
 if(!validCount(count))return {ok:false,reason:'invalid_count'};
 if(kind==='equipment'){
  const item=stock?.equipment?.items?.find(i=>i.uid===ref);
  if(!allowed(item))return {ok:false,reason:'item_unavailable'};
  return count===1?{ok:true,item}:{ok:false,reason:'invalid_count'};
 }
 if(kind==='potion'){
  const item=stock?.potions?.items?.find(p=>potionKey(p)===ref);
  if(item?.bound||item?.noTrade)return {ok:false,reason:'item_unavailable'};
  return item&&validCount(item.count)&&item.count>=count?{ok:true,item}:{ok:false,reason:'not_enough'};
 }
 if(kind==='material'&&materialInfo(ref).bound)return {ok:false,reason:'item_unavailable'};
 if(kind==='material'&&Object.hasOwn(stock?.materials||{},ref))return validCount(stock.materials[ref])&&stock.materials[ref]>=count?{ok:true}:{ok:false,reason:'not_enough'};
 if(kind==='currency'&&Object.hasOwn(CURRENCIES,ref))return validCount(stock?.[ref])&&stock[ref]>=count?{ok:true}:{ok:false,reason:'not_enough'};
 return {ok:false,reason:'invalid_kind'};
}
/** Validate everything before changing either stock; equipment metadata is kept intact. */
export function transferStock(source,target,request,{limit=Infinity,slots=null}={}){
 const checked=validateStock(source,request);if(!checked.ok)return checked;
 const {kind,ref,count}=request;
 const row=stockRows(source).find(r=>r.kind===kind&&r.ref===ref);
 const existing=stockRows(target).find(r=>r.kind===kind&&r.ref===ref);
 if(kind==='equipment'&&target?.equipment?.items?.some(i=>i.uid===ref))return {ok:false,reason:'duplicate_item'};
 if(slots){if(kind!=='currency'&&!existing&&slots(target)>=limit)return {ok:false,reason:'inventory_full'};}
 else if(!existing&&storageSlots(target)>=limit)return {ok:false,reason:'warehouse_full'};
 const destination=kind==='currency'?target[ref]:kind==='material'?target.materials?.[ref]:kind==='potion'?target.potions?.items?.find(p=>potionKey(p)===ref)?.count:0;
 if(kind!=='equipment'&&(!Number.isSafeInteger(destination??0)||(destination??0)<0||!Number.isSafeInteger((destination??0)+count)))return {ok:false,reason:'invalid_count'};
 if(kind==='equipment'){
  source.equipment.items.splice(source.equipment.items.indexOf(checked.item),1);
  target.equipment ||= {items:[]};target.equipment.items ||= [];target.equipment.items.push(structuredClone(checked.item));
 }else if(kind==='potion'){
  checked.item.count-=count;target.potions ||= {items:[]};target.potions.items ||= [];
  const stack=target.potions.items.find(p=>potionKey(p)===ref);
  if(stack)stack.count+=count;else target.potions.items.push({...structuredClone(checked.item),count});
 }else if(kind==='material'){
  source.materials[ref]-=count;target.materials ||= {};target.materials[ref]=(target.materials[ref]||0)+count;
 }else{source[ref]-=count;target[ref]=(target[ref]||0)+count;}
 return {ok:true,title:row?.title||ref,count};
}
