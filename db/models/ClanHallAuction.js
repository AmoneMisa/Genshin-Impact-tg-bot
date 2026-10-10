import mongoose from 'mongoose';

// One shared record per hall. Ownership and escrow survive process restarts.
const schema = new mongoose.Schema({
  _id: String,
  closesAt: {type: Number, required: true},
  bid: {type: Object, default: null},
  owner: {type: Object, default: null},
}, {versionKey: false});
export default mongoose.models.ClanHallAuction || mongoose.model('ClanHallAuction', schema, 'clan_hall_auctions');
