import mongoose from 'mongoose';
import Chat from '../db/models/Chat.js';
import Clan from '../db/models/Clan.js';
import {goldLockForMember,GOLD_LOCK_REASON} from '../functions/game/general/goldLock.js';
import {canDepositClan,canWithdrawClan,coLeaders} from '../functions/game/clans/warehouseAccess.js';
import {stockRows,storageSlots,STORAGE_SLOTS,transferStock} from './itemTransfer.js';
export function warehouseDto(player,clan=null,scope='character'){
 const store=scope==='clan'?clan?.warehouse:player?.game?.warehouse;
 const inventory=player.game?.inventory||{};
 const rows=stockRows(inventory).filter(row=>scope!=='clan'||row.kind!=='equipment'||!hasAugment(inventory.equipment.items.find(i=>i.uid===row.ref)));
 return {scope,title:scope==='clan'?'Хранилище клана':'Личное хранилище',canDeposit:scope!=='clan'||canDepositClan(clan,player.userId),canWithdraw:scope!=='clan'||canWithdrawClan(clan,player.userId),maxSlots:STORAGE_SLOTS,slots:storageSlots(store||{}),stored:stockRows(store||{}),inventory:rows,coLeaders:coLeaders(clan).map(m=>String(m.userId)),history:scope==='clan'?(clan?.warehouse?.history||[]).slice(-20).reverse():[]};
}
const hasAugment=item=>Boolean(item?.augment||item?.augmentation);
export function moveWarehouse(player,clan,body,now=Date.now()){
 const scope=body.scope||'character',direction=body.direction;
 if(!['character','clan'].includes(scope)||!['deposit','withdraw'].includes(direction))return {ok:false,reason:'invalid_action'};
 if(scope==='clan'&&(!canDepositClan(clan,player.userId)||direction==='withdraw'&&!canWithdrawClan(clan,player.userId)))return {ok:false,reason:'warehouse_forbidden'};
 const inventory=player.game?.inventory;if(!inventory)return {ok:false,reason:'inventory_missing'};
 if(scope==='clan'&&direction==='deposit'&&body.kind==='equipment'&&hasAugment(inventory.equipment?.items?.find(i=>i.uid===String(body.ref))))return {ok:false,reason:'augmented_item'};
 const store=scope==='clan'?(clan.warehouse||{}):(player.game.warehouse||{});
 const count=Number(body.count);
 if(!['number','string'].includes(typeof body.count))return {ok:false,reason:'invalid_count'};
 if(typeof body.count==='string'&&!/^\d+$/.test(body.count.trim()))return {ok:false,reason:'invalid_count'};
 const result=transferStock(direction==='deposit'?inventory:store,direction==='deposit'?store:inventory,{kind:body.kind,ref:String(body.ref||''),count},{limit:direction==='deposit'?STORAGE_SLOTS:Infinity});
 if(result.ok){
  if(scope==='clan'){
   clan.warehouse=store;store.history=[...(store.history||[]),{userId:String(player.userId),direction,title:result.title,count,at:now}].slice(-100);
  }else player.game.warehouse=store;
 }
 return result;
}
export async function warehouseFor(chatId,userId,scope='character'){
 const chat=await Chat.findOne({chatId});const player=chat?.members.find(m=>String(m.userId)===String(userId));
 if(!player)return null;
 const clan=scope==='clan'?await Clan.findOne({'members.userId':userId}):null;
 return warehouseDto(player,clan,scope);
}
export async function transferWarehouse(chatId,userId,body){
 const session=await mongoose.startSession();
 try{return await session.withTransaction(async()=>{
  const chat=await Chat.findOne({chatId}).session(session),player=chat?.members.find(m=>String(m.userId)===String(userId));
  if(!player)return {ok:false,reason:'unknown_player'};
  const clan=body.scope==='clan'?await Clan.findOne({'members.userId':userId}).session(session):null;
  if(body.kind==='currency'&&body.ref==='gold'&&goldLockForMember(player,chat))return {ok:false,reason:GOLD_LOCK_REASON};
  const result=moveWarehouse(player,clan,body);
  if(result.ok){await chat.save({session});if(clan)await clan.save({session});}
  return result;
 });}finally{await session.endSession();}
}
