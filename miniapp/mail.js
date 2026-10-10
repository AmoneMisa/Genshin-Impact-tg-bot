import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Chat from '../db/models/Chat.js';
import {getMailbox,claimMail} from './promo.js';
import {memberName} from './social.js';
import {stockRows,transferStock} from './itemTransfer.js';
import {goldLockForMember,GOLD_LOCK_REASON} from '../functions/game/general/goldLock.js';

export const MAIL_POSTAGE=100, MAIL_SLOTS=12, MAIL_LIFETIME=15*86400000;
const member=(chat,id)=>chat.members.find(m=>String(m.userId)===String(id));
const inventory=m=>m?.game?.inventory||{};
const fail=reason=>({ok:false,reason});
function moveAll(source,target){
  for(const row of stockRows(source)){const result=transferStock(source,target,row);if(!result.ok)return result;}
  return {ok:true};
}
// Unclaimed attachments always return to the sender; expiry never destroys them.
export function expirePlayerMail(chat,now=Date.now()){
  let changed=false;
  for(const letter of chat.game?.playerMail||[]){
    if(letter.status!=='pending'||letter.expiresAt>now)continue;
    const sender=member(chat,letter.from);if(!sender)continue;
    const target=structuredClone(inventory(sender)),source=structuredClone(letter.stock);
    if(!moveAll(source,target).ok)continue;
    sender.game.inventory=target;letter.stock=source;letter.status='returned';changed=true;
  }
  return changed;
}
export function playerMailPending(chat,userId,now=Date.now()){
  return (chat.game?.playerMail||[]).filter(l=>l.to===String(userId)&&l.status==='pending'&&l.expiresAt>now).length;
}
export function mailState(chat,userId,now=Date.now()){
  const me=member(chat,userId),id=String(userId);
  const system=getMailbox(me,now).letters.map(l=>({...l,fromName:'Система',type:'regular',rewards:l.rewards,system:true}));
  const letters=[],sent=[];
  for(const l of chat.game?.playerMail||[]){
    if(l.from!==id&&l.to!==id)continue;
    if(l.hidden?.includes(id))continue;
    const dto={id:l.id,title:l.title,text:l.text,type:l.type,status:l.status,createdAt:l.createdAt,expiresAt:l.expiresAt,fromName:l.fromName,toName:l.toName,from:l.from,to:l.to,price:l.price,attachments:l.items,rewards:[]};
    if(l.to===id)letters.push(dto);if(l.from===id)sent.push(dto);
  }
  letters.push(...system);letters.sort((a,b)=>b.createdAt-a.createdAt);sent.sort((a,b)=>b.createdAt-a.createdAt);
  return {letters,sent,pending:letters.filter(l=>l.status==='pending').length,inventory:stockRows(inventory(me)),gold:inventory(me).gold||0,postage:MAIL_POSTAGE,maxSlots:MAIL_SLOTS,peers:chat.members.filter(m=>String(m.userId)!==id&&!m.isHided&&!m.userChatData?.user?.is_bot).map(m=>({userId:String(m.userId),name:memberName(m)}))};
}
export function actMail(chat,userId,body,now=Date.now()){
  const me=member(chat,userId),id=String(userId);if(!me)return fail('unknown_player');
  if(body.action==='send'){
    const other=member(chat,body.to);
    if(!other||other===me||other.isHided||other.userChatData?.user?.is_bot)return fail('unknown_player');
    const title=typeof body.title==='string'?body.title.trim():'';
    if(!title||title.length>80||typeof body.text!=='string'||body.text.length>2000)return fail('mail_text');
    if(!['regular','payment'].includes(body.type)||!Array.isArray(body.items)||body.items.length>MAIL_SLOTS)return fail('mail_items');
    const price=body.type==='payment'?body.price:0;
    if(!Number.isSafeInteger(price)||price<0||body.type==='payment'&&(!price||!body.items.length))return fail('mail_price');
    if((chat.game?.playerMail||[]).filter(l=>l.status==='pending'&&(l.from===id||l.to===String(other.userId))).length>=100)return fail('mail_full');
    if(goldLockForMember(me,chat,now))return fail(GOLD_LOCK_REASON);
    const source=structuredClone(inventory(me)),stock={},seen=new Set();
    if((source.gold||0)<MAIL_POSTAGE)return fail('mail_postage');source.gold-=MAIL_POSTAGE;
    for(const raw of body.items){
      if(!raw||typeof raw.ref!=='string')return fail('mail_items');
      const key=raw.kind+':'+raw.ref;if(seen.has(key))return fail('duplicate_item');seen.add(key);
      const moved=transferStock(source,stock,raw);if(!moved.ok)return moved;
    }
    const letter={id:'player:'+crypto.randomUUID(),from:id,to:String(other.userId),fromName:memberName(me),toName:memberName(other),title,text:body.text.trim(),type:body.type,price,stock,items:stockRows(stock),status:'pending',createdAt:now,expiresAt:now+MAIL_LIFETIME,hidden:[]};
    me.game.inventory=source;chat.game||={};chat.game.playerMail||=[];chat.game.playerMail.push(letter);
    return {ok:true,message:'Письмо отправлено.',id:letter.id};
  }
  const letter=(chat.game?.playerMail||[]).find(l=>l.id===body.id);
  if(!letter){
    if(body.action==='claim')return claimMail(me,body.id,now);
    const system=me.game?.mailbox?.find(l=>l.id===body.id);
    if(body.action==='delete'&&system){if(system.status==='pending')return fail('mail_claim_first');me.game.mailbox=me.game.mailbox.filter(l=>l!==system);return {ok:true,message:'Письмо удалено.'};}
    return fail('mail_not_found');
  }
  if(letter.to!==id&&letter.from!==id)return fail('mail_not_found');
  if(body.action==='claim'){
    if(letter.to!==id)return fail('mail_not_found');
    if(letter.status!=='pending'||letter.expiresAt<=now)return fail('already_claimed');
    const sender=member(chat,letter.from);if(!sender)return fail('unknown_player');
    const target=structuredClone(inventory(me)),senderStock=structuredClone(inventory(sender)),source=structuredClone(letter.stock);
    if(letter.price){
      if(goldLockForMember(me,chat,now))return fail(GOLD_LOCK_REASON);
      if((target.gold||0)<letter.price)return fail('mail_payment');
      if(!Number.isSafeInteger((senderStock.gold||0)+letter.price))return fail('invalid_count');
      target.gold-=letter.price;senderStock.gold=(senderStock.gold||0)+letter.price;
    }
    const moved=moveAll(source,target);if(!moved.ok)return moved;
    me.game.inventory=target;if(letter.price)sender.game.inventory=senderStock;
    letter.stock=source;letter.status='claimed';letter.claimedAt=now;
    return {ok:true,message:letter.price?'Платёж отправлен, вложения получены.':'Письмо получено.'};
  }
  if(body.action==='delete'){
    let returned=false;
    // The sender may hide sent mail, but cannot recall it after delivery.
    if(letter.to===id&&letter.status==='pending'){
      const sender=member(chat,letter.from);if(!sender)return fail('unknown_player');
      const target=structuredClone(inventory(sender)),source=structuredClone(letter.stock);
      const moved=moveAll(source,target);if(!moved.ok)return moved;
      sender.game.inventory=target;letter.stock=source;letter.status='returned';
      returned=true;
    }
    letter.hidden||=[];if(!letter.hidden.includes(id))letter.hidden.push(id);
    return {ok:true,message:returned?'Письмо удалено. Неполученные вложения возвращены отправителю.':'Письмо удалено из списка.'};
  }
  return fail('invalid_action');
}
export async function mailboxFor(chatId,userId,body=null){
  const session=await mongoose.startSession();
  try{return await session.withTransaction(async()=>{
    const chat=await Chat.findOne({chatId}).session(session);if(!chat||!member(chat,userId))return fail('unknown_player');
    const changed=expirePlayerMail(chat),result=body?actMail(chat,userId,body):{ok:true};
    const mail=mailState(chat,userId);
    if(changed||body&&result.ok)await chat.save({session});
    return {...result,mail};
  });}finally{await session.endSession();}
}
