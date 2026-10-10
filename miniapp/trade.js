import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Chat from '../db/models/Chat.js';
import {memberName} from './social.js';
import {goldLockForMember,GOLD_LOCK_REASON} from '../functions/game/general/goldLock.js';
import {stockRows,validateStock,transferStock} from './itemTransfer.js';
export const TRADE_MS=10*60*1000,TRADE_SLOTS=12;
const participant=(t,id)=>String(t.from)===String(id)||String(t.to)===String(id);
const live=(t,now)=>['invited','active'].includes(t.status)&&t.expiresAt>now;
const member=(chat,id)=>chat.members.find(m=>String(m.userId)===String(id));
const stock=player=>player?.game?.inventory||{};
export function tradeState(chat,userId,now=Date.now()){
 const trade=(chat.game?.trades||[]).find(t=>participant(t,userId)&&live(t,now));
 const peers=chat.members.filter(m=>String(m.userId)!==String(userId)&&!m.isHided&&!m.userChatData?.user?.is_bot).map(m=>({userId:String(m.userId),name:memberName(m)}));
 const visible=trade?structuredClone(trade):null;
 if(visible)for(const rows of Object.values(visible.offers))for(const row of rows)delete row.fingerprint;
 return {trade:visible,me:String(userId),peers,inventory:stockRows(stock(member(chat,userId))),maxSlots:TRADE_SLOTS};
}
export function actTrade(chat,userId,body,now=Date.now()){
 const me=member(chat,userId);if(!me)return {ok:false,reason:'unknown_player'};
 const records=chat.game?.trades||[];
 if(body.action==='request'){
  const other=member(chat,body.targetId);
  if(!other||other.isHided||other.userChatData?.user?.is_bot||String(other.userId)===String(userId))return {ok:false,reason:'unknown_player'};
  if(records.some(t=>live(t,now)&&(participant(t,userId)||participant(t,other.userId))))return {ok:false,reason:'trade_busy'};
  const trade={id:crypto.randomUUID(),from:String(userId),to:String(other.userId),names:{[userId]:memberName(me),[other.userId]:memberName(other)},status:'invited',revision:0,offers:{[userId]:[],[other.userId]:[]},accepted:{},expiresAt:now+TRADE_MS};
  chat.game ||= {};chat.game.trades=[...records.filter(t=>live(t,now)),trade];
  return {ok:true,tradeId:trade.id,message:'Приглашение на обмен отправлено.'};
 }
 const trade=records.find(t=>t.id===body.id);
 if(!trade||!participant(trade,userId)||!live(trade,now))return {ok:false,reason:'trade_closed'};
 if(body.action==='cancel'){trade.status='cancelled';return {ok:true,message:'Обмен отменён.'};}
 if(body.action==='join'){
  if(trade.status!=='invited'||String(trade.to)!==String(userId))return {ok:false,reason:'trade_closed'};
  trade.status='active';return {ok:true};
 }
 if(trade.status!=='active')return {ok:false,reason:'trade_not_ready'};
 if(body.revision!==trade.revision)return {ok:false,reason:'trade_changed'};
 if(body.action==='offer'){
  if(!Array.isArray(body.items)||body.items.length>TRADE_SLOTS)return {ok:false,reason:'trade_too_many'};
  const seen=new Set(),offer=[];
  for(const raw of body.items){
   if(!raw||typeof raw!=='object'||!['number','string'].includes(typeof raw.count))return {ok:false,reason:'invalid_count'};
   const request={kind:raw.kind,ref:String(raw.ref||''),count:Number(raw.count)};
   const token=request.kind+':'+request.ref;
   if(seen.has(token))return {ok:false,reason:'duplicate_item'};seen.add(token);
   const checked=validateStock(stock(me),request);if(!checked.ok)return checked;
   const row=stockRows(stock(me)).find(r=>r.kind===request.kind&&r.ref===request.ref);
   if(!row)return {ok:false,reason:'item_unavailable'};
   offer.push({...row,count:request.count,fingerprint:request.kind==='equipment'?JSON.stringify(checked.item):null});
  }
  trade.offers[String(userId)]=offer;trade.revision++;trade.accepted={};
  return {ok:true,message:'Предложение обновлено. Подтверждения сброшены.'};
 }
 if(body.action!=='confirm')return {ok:false,reason:'invalid_action'};
 const a=member(chat,trade.from),b=member(chat,trade.to);
 if(!a||!b)return {ok:false,reason:'unknown_player'};
 if(!trade.offers[trade.from].length&&!trade.offers[trade.to].length)return {ok:false,reason:'trade_empty'};
 // Revalidate both offers against current possessions, including enchant/SA/augmentation changes.
 for(const player of [a,b])for(const row of trade.offers[String(player.userId)]){
  if(row.kind==='currency'&&row.ref==='gold'&&goldLockForMember(player,chat,now))return {ok:false,reason:GOLD_LOCK_REASON};
  const checked=validateStock(stock(player),row);
  if(!checked.ok||row.fingerprint&&row.fingerprint!==JSON.stringify(checked.item))return {ok:false,reason:'trade_items_changed'};
 }
 const accepted={...trade.accepted,[userId]:trade.revision};
 if(accepted[trade.from]!==trade.revision||accepted[trade.to]!==trade.revision){trade.accepted=accepted;return {ok:true,message:'Подтверждено. Ждём второго игрока.'};}
 const left=structuredClone(stock(a)),right=structuredClone(stock(b));
 for(const [from,to,rows] of [[left,right,trade.offers[trade.from]],[right,left,trade.offers[trade.to]]])for(const row of rows){
  const moved=transferStock(from,to,row);if(!moved.ok)return moved;
 }
 a.game.inventory=left;b.game.inventory=right;trade.accepted=accepted;trade.status='completed';trade.completedAt=now;
 return {ok:true,completed:true,message:'Обмен завершён.'};
}
export async function tradeFor(chatId,userId){const chat=await Chat.findOne({chatId});return tradeState(chat,userId);}
export async function performTrade(chatId,userId,body){
 const session=await mongoose.startSession();
 try{return await session.withTransaction(async()=>{
  const chat=await Chat.findOne({chatId}).session(session);
  if(!chat)return {ok:false,reason:'unknown_player'};
  const result=actTrade(chat,userId,body);
  if(result.ok)await chat.save({session});
  return result;
 });}finally{await session.endSession();}
}
