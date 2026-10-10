import test from 'node:test';
import assert from 'node:assert/strict';
import {AUCTION_HALLS,HALL_BIDDING_MS,HALL_LEASE_MS,nextHallBid,placeHallBid,settleHallAuction} from '../functions/game/clans/hallAuction.js';
import {ensureHall} from '../functions/game/clans/clanHall.js';
const hall=AUCTION_HALLS[0],now=100000;
const clan=id=>({_id:id,name:id,level:3,warehouse:{gold:2_000_000},hall:{level:1,glory:0,lastTickAt:now}});
const auction=()=>({closesAt:now+HALL_BIDDING_MS,bid:null,owner:null});
test('warehouse bids reserve money, increasing own bid pays only the difference, outbid clans get a full refund',()=>{
 const a=clan('a'),b=clan('b'),r=auction();
 assert.equal(placeHallBid(hall,r,a,null,300_000,now).ok,true);
 assert.equal(a.warehouse.gold,1_700_000);
 assert.equal(nextHallBid(hall,r),315_000);
 assert.equal(placeHallBid(hall,r,a,null,315_000,now).ok,true);
 assert.equal(a.warehouse.gold,1_685_000);
 assert.equal(placeHallBid(hall,r,b,a,330_750,now).ok,true);
 assert.equal(a.warehouse.gold,2_000_000);assert.equal(b.warehouse.gold,1_669_250);
 assert.equal(r.bid.clanId,'b');
});
test('invalid, unaffordable, occupied and late bids change no balances or auction records',()=>{
 for(const [modify,amount,at,occupied,reason] of [
  [()=>{},299_999,now,false,'hall_bid_too_low'],[()=>{},NaN,now,false,'hall_bid_too_low'],
  [a=>a.level=2,300_000,now,false,'hall_clan_level'],[a=>a.warehouse.gold=1,300_000,now,false,'warehouse_insufficient'],
  [()=>{},300_000,now,true,'hall_already_reserved'],[()=>{},300_000,now+HALL_BIDDING_MS,false,'hall_auction_closed'],
 ]){
  const a=clan('a'),r=auction();modify(a);const before=structuredClone({a,r});
  assert.equal(placeHallBid(hall,r,a,null,amount,at,occupied).reason,reason);assert.deepEqual({a,r},before);
 }
});
test('settlement grants one seven-day lease, no second charge, hourly Glory stops at expiry and the hall reopens',()=>{
 const a=clan('a'),r=auction();placeHallBid(hall,r,a,null,300_000,now);
 const close=r.closesAt;
 assert.equal(settleHallAuction(hall,r,a,close-1),false);
 assert.equal(settleHallAuction(hall,r,a,close),true);assert.equal(r.bid,null);
 assert.equal(r.owner.clanId,'a');assert.equal(r.owner.until,close+HALL_LEASE_MS);
 assert.equal(a.warehouse.gold,1_700_000);
 assert.equal(settleHallAuction(hall,r,null,close+1),false);
 ensureHall(a,close+2*3_600_000);assert.equal(a.hall.glory,10);
 ensureHall(a,close+HALL_LEASE_MS+3_600_000);assert.equal(a.hall.glory,168*5);
 ensureHall(a,close+HALL_LEASE_MS+5*3_600_000);assert.equal(a.hall.glory,168*5);
 assert.equal(settleHallAuction(hall,r,null,r.owner.until),true);assert.equal(r.owner,null);
 assert.equal(r.closesAt,close+HALL_LEASE_MS+HALL_BIDDING_MS);
});
test('late settlement retains earned Glory even after a restart and the entire lease passed',()=>{
 const a=clan('a');let r=auction();placeHallBid(hall,r,a,null,300_000,now);
 r=JSON.parse(JSON.stringify(r));
 assert.equal(settleHallAuction(hall,r,a,r.closesAt+HALL_LEASE_MS+1),true);
 assert.equal(a.hall.glory,168*5);assert.equal(r.owner,null);assert.equal(r.bid,null);
});
