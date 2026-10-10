import mongoose from 'mongoose';
import Clan from '../db/models/Clan.js';
import Auction from '../db/models/ClanHallAuction.js';
import {AUCTION_HALLS,HALL_BIDDING_MS,nextHallBid,placeHallBid,settleHallAuction} from '../functions/game/clans/hallAuction.js';

async function transaction(run) {
  const session=await mongoose.startSession();
  try { return await session.withTransaction(()=>run(session)); }
  finally { await session.endSession(); }
}
async function prepare(now) {
  for (const hall of AUCTION_HALLS) {
    await Auction.updateOne({_id:hall.id},{$setOnInsert:{closesAt:now+HALL_BIDDING_MS,bid:null,owner:null}},{upsert:true});
    const due=await Auction.findOne({_id:hall.id,closesAt:{$lte:now},$or:[{owner:null},{'owner.until':{$lte:now}}]}).lean();
    if (!due) continue;
    await transaction(async session=>{
      const record=await Auction.findById(hall.id).session(session);
      const winner=record.bid?await Clan.findById(record.bid.clanId).session(session):null;
      if (!settleHallAuction(hall,record,winner,now)) return;
      if (winner) await winner.save({session});
      record.markModified('bid');record.markModified('owner');await record.save({session});
    });
  }
}
export async function getHallAuctions(clan,userId,now=Date.now()) {
  await prepare(now);
  const records=await Auction.find().lean();
  const canManage=String(clan.owner)===String(userId)||clan.members?.some(m=>String(m.userId)===String(userId)&&m.role==='officer');
  const reserved=records.find(r=>String(r.bid?.clanId)===String(clan._id)||r.owner?.until>now&&String(r.owner.clanId)===String(clan._id));
  return {minClanLevel:3,leaseDays:7,canManage,halls:AUCTION_HALLS.map(hall=>{
    const r=records.find(r=>r._id===hall.id),owned=r.owner?.until>now,mine=String((owned?r.owner:r.bid)?.clanId)===String(clan._id);
    return {...hall,closesAt:r.closesAt,owner:owned?r.owner:null,bid:r.bid,mine,minBid:nextHallBid(hall,r),ownBid:!owned&&mine?r.bid.amount:0,canBid:canManage&&clan.level>=3&&!owned&&(!reserved||reserved._id===hall.id),remainingMs:Math.max(0,(owned?r.owner.until:r.closesAt)-now)};
  })};
}
export async function bidForClanHall(userId,id,rawAmount,now=Date.now()) {
  const hall=AUCTION_HALLS.find(h=>h.id===id);
  if(!hall) return {ok:false,reason:'unknown_hall'};
  if(typeof rawAmount==='string'&&!/^\d+$/.test(rawAmount.trim())) return {ok:false,reason:'hall_bid_too_low'};
  await prepare(now);
  return transaction(async session=>{
    const clan=await Clan.findOne({'members.userId':userId}).session(session);
    if(!clan) return {ok:false,reason:'not_in_clan'};
    if(String(clan.owner)!==String(userId)&&!clan.members.some(m=>String(m.userId)===String(userId)&&m.role==='officer')) return {ok:false,reason:'not_allowed'};
    const record=await Auction.findById(id).session(session);
    const other=await Auction.findOne({_id:{$ne:id},$or:[{'bid.clanId':String(clan._id)},{'owner.clanId':String(clan._id),'owner.until':{$gt:now}}]}).session(session);
    const previous=record.bid&&record.bid.clanId!==String(clan._id)?await Clan.findById(record.bid.clanId).session(session):null;
    const result=placeHallBid(hall,record,clan,previous,Number(rawAmount),now,Boolean(other));
    if(!result.ok) return result;
    await clan.save({session});if(previous) await previous.save({session});
    record.markModified('bid');await record.save({session});
    return result;
  });
}
