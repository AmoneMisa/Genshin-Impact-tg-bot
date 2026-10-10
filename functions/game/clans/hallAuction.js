import {ensureHall} from './clanHall.js';
// Prices are adapted to this game's clan warehouse economy.
export const HALL_BIDDING_MS = 24 * 60 * 60 * 1000;
export const HALL_LEASE_MS = 7 * 24 * 60 * 60 * 1000;
export const AUCTION_HALLS = Object.freeze([
  {id:'gludio', name:'Gludio Clan Hall', town:'Глудио', grade:'C', minimum:300_000, gloryPerHour:5},
  {id:'dion', name:'Dion Clan Hall', town:'Дион', grade:'C', minimum:300_000, gloryPerHour:5},
  {id:'gludin', name:'Gludin Clan Hall', town:'Глудин', grade:'B', minimum:600_000, gloryPerHour:8},
  {id:'giran', name:'Giran Clan Hall', town:'Гиран', grade:'B', minimum:600_000, gloryPerHour:8},
  {id:'aden', name:'Aden Clan Hall', town:'Аден', grade:'A', minimum:1_000_000, gloryPerHour:12},
  {id:'rune', name:'Rune Clan Hall', town:'Руна', grade:'A', minimum:1_000_000, gloryPerHour:12},
]);
export const nextHallBid = (hall, record) => record.bid ? record.bid.amount + Math.max(1,Math.ceil(record.bid.amount * .05)) : hall.minimum;

/** All validation happens before any money moves. The repository commits these documents atomically. */
export function placeHallBid(hall, record, clan, previousClan, amount, now, occupied=false) {
  if (record.owner?.until > now || record.closesAt <= now) return {ok:false,reason:'hall_auction_closed'};
  if (Number(clan.level||1)<3) return {ok:false,reason:'hall_clan_level'};
  if (occupied) return {ok:false,reason:'hall_already_reserved'};
  if (!Number.isSafeInteger(amount) || amount < nextHallBid(hall,record)) return {ok:false,reason:'hall_bid_too_low'};
  const same=String(record.bid?.clanId)===String(clan._id);
  const debit=amount-(same?record.bid.amount:0);
  if (!Number.isSafeInteger(clan.warehouse?.gold) || clan.warehouse.gold<debit) return {ok:false,reason:'warehouse_insufficient'};
  if (record.bid && !same && (!previousClan||!Number.isSafeInteger(previousClan.warehouse?.gold)||!Number.isSafeInteger(previousClan.warehouse.gold+record.bid.amount))) return {ok:false,reason:'hall_bid_clan_missing'};
  clan.warehouse.gold-=debit;
  if (record.bid && !same) previousClan.warehouse.gold+=record.bid.amount;
  record.bid={clanId:String(clan._id),name:clan.name,amount,at:now};
  return {ok:true,message:'Ставка принята. Адена зарезервирована из хранилища клана.'};
}

export function settleHallAuction(hall, record, winner, now) {
  if (record.owner?.until > now || record.closesAt > now) return false;
  const until=record.closesAt+HALL_LEASE_MS;
  if (record.bid && winner && until>now) {
    ensureHall(winner,now);
    record.owner={clanId:record.bid.clanId,name:record.bid.name,amount:record.bid.amount,until};
    winner.hall ||= {};
    winner.hall.estate={id:hall.id,name:hall.name,town:hall.town,until,gloryPerHour:hall.gloryPerHour,lastTickAt:record.closesAt};
    record.bid=null;
    return true;
  }
  // A visit after the entire lease still awards the completed lease's farm Glory.
  if (record.bid && winner) {
    winner.hall ||= {};
    winner.hall.glory=(Number(winner.hall.glory)||0)+Math.floor(HALL_LEASE_MS/3_600_000)*hall.gloryPerHour;
  }
  record.owner=null; record.bid=null; record.closesAt=now+HALL_BIDDING_MS;
  return true;
}
