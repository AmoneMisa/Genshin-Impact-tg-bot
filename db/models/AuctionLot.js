import mongoose from 'mongoose';

// A lot of the shared auction (miniapp/auction.js); `chatId` is the chat of the character that listed it. The item sits here in escrow until the lot is
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
    buyerChatId: Number,
    // adena the seller still has to collect after a sale made from another chat
    payout: Number,
    paidOut: {type: Boolean, default: false},
    soldAt: Number,
    returned: {type: Boolean, default: false},
}, {timestamps: true, versionKey: false});

export default mongoose.models.AuctionLot || mongoose.model('AuctionLot', AuctionLotSchema, 'auction_lots');
