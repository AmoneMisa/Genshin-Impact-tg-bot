import mongoose from 'mongoose';

// A lot of the chat auction (miniapp/auction.js). The item sits here in escrow until the lot is
// sold, cancelled or expires; `payload` is what is delivered, `view` what the screens show.
const AuctionLotSchema = new mongoose.Schema({
    chatId: {type: Number, required: true, index: true},
    sellerId: {type: Number, required: true, index: true},
    sellerName: String,
    kind: {type: String, enum: ['equipment', 'potion', 'material'], required: true},
    count: {type: Number, default: 1},
    price: {type: Number, required: true},
    view: {type: Object, default: {}},
    payload: {type: Object, default: {}},
    status: {type: String, enum: ['active', 'sold', 'cancelled', 'expired'], default: 'active', index: true},
    expiresAt: {type: Number, required: true, index: true},
    buyerId: Number,
    soldAt: Number,
    returned: {type: Boolean, default: false},
}, {timestamps: true, versionKey: false});

export default mongoose.models.AuctionLot || mongoose.model('AuctionLot', AuctionLotSchema, 'auction_lots');
