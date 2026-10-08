import mongoose from 'mongoose';

// Ledger of Telegram Stars purchases (miniapp/stars.js). A document is created when an
// invoice is requested and walks pending -> paid (+credited) -> refunded.
const StarPurchaseSchema = new mongoose.Schema({
    chatId: {type: Number, required: true, index: true},
    userId: {type: Number, required: true, index: true},
    packId: {type: String, required: true},
    stars: {type: Number, required: true},
    // What the pack pays out. Rows from before Coins of Luck have no `currency` and pay crystals.
    currency: {type: String, enum: ['crystals', 'luckCoins'], default: 'crystals'},
    coins: {type: Number, default: 0},                  // luckCoins pack, without the first-purchase bonus
    bonusCoins: {type: Number, default: 0},             // luckCoins first-purchase bonus, fixed when the payment lands
    crystals: {type: Number, default: 0},               // legacy crystals pack
    bonusCrystals: {type: Number, default: 0},          // legacy crystals first-purchase bonus
    status: {type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending', index: true},
    credited: {type: Boolean, default: false},          // the payout is in the player's inventory
    chargeId: {type: String, unique: true, sparse: true},
    providerChargeId: String,
    expiresAt: {type: Date, required: true},
    paidAt: Date,
    refundedAt: Date,
}, {timestamps: true, versionKey: false});

export default mongoose.models.StarPurchase || mongoose.model('StarPurchase', StarPurchaseSchema, 'star_purchases');
