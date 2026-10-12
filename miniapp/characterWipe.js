import mongoose from 'mongoose';
import Chat from '../db/models/Chat.js';
import AuctionLot from '../db/models/AuctionLot.js';
import ArenaRating from '../db/models/ArenaRating.js';
import RtaFighter from '../db/models/RtaFighter.js';
import defaults from '../functions/getters/getLostFieldsInSession.js';
import updatePlayerStats from '../functions/game/player/updatePlayerStats.js';
import {leaveParty} from '../functions/game/party/party.js';
import {attachGuests} from '../functions/general/partyGuests.js';
import {storeForSession,guestUsers} from '../functions/general/characterStore.js';
import {memberName} from './social.js';
import {tableLockFor} from '../functions/game/general/goldLock.js';

// Reset gameplay only. Telegram identity, profile, preferences and clan membership remain.
export function resetCharacter(member) {
 member.game={};
 Object.assign(member,{sword:0,swordImmune:false,immuneToUpSword:false,chestCounter:0,
  chosenChests:[],chestButtons:[],chestTries:1,timerSwordCallback:0,timerTitleCallback:0,changeClassTimer:0});
 defaults(member);updatePlayerStats(member);
}

export async function wipeCharacter(chatId,userId) {
 const session=await mongoose.startSession();
 try {return await session.withTransaction(async()=>{
  // Read the existing member directly: a typo must never create a new player.
  const chat=await Chat.findOne({chatId}).session(session);
  const member=chat?.members.find(m=>String(m.userId)===String(userId)&&!m.userChatData?.user?.is_bot&&!m.isHided);
  if(!member)return {ok:false,reason:'unknown_player'};
  const name=memberName(member),id=Number(member.userId);
  const chats=await Chat.find({'members.userId':id}).session(session);
  if(chats.some(row=>tableLockFor(row,id)))return {ok:false,reason:'wipe_in_table_game'};
  if(member.game?.party?.id){
   await attachGuests(chat,{partyIds:[member.game.party.id]},{store:storeForSession(session),users:guestUsers});
   leaveParty(chat,member);
  }
  resetCharacter(member);
  // Shared-character revision checks and the party peers commit in this same transaction.
  await chat.save({session});
  // Escrow is discarded, not returned to the newly reset character.
  await AuctionLot.updateMany({sellerId:id,status:'active'},{$set:{status:'cancelled',returned:true},$unset:{payload:1}},{session});
  await ArenaRating.deleteMany({userId:id},{session});
  await RtaFighter.deleteMany({userId:id},{session});
  await Chat.updateMany({'game.trades':{$elemMatch:{$or:[{from:String(id)},{to:String(id)}],status:{$in:['invited','active']}}}},
   {$set:{'game.trades.$[trade].status':'cancelled','game.trades.$[trade].accepted':{}},$inc:{__v:1}},
   {session,arrayFilters:[{$or:[{'trade.from':String(id)},{'trade.to':String(id)}],'trade.status':{$in:['invited','active']}}]});
  await Chat.updateMany({'members.userId':id},{$set:{'members.$[player].timerSwordCallback':0,
   'members.$[player].timerTitleCallback':0,'members.$[player].chestButtons':[]},$inc:{__v:1}},
   {session,arrayFilters:[{'player.userId':id}]});
  return {ok:true,message:`${name}: персонаж сброшен до начального состояния во всех чатах.`};
 });} finally {await session.endSession();}
}
