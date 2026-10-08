import mongoose from 'mongoose';

// Promo codes created by the admin in the Mini App (miniapp/promo.js). A code
// is global: one redemption per Telegram user, optionally capped by maxUses.
// Rewards are delivered to the player's in-game mail, not applied directly.
const PromoCodeSchema = new mongoose.Schema({
    code: {type: String, required: true, unique: true},
    rewards: {type: [{_id: false, kind: String, amount: Number}], default: []},
    startsAt: {type: Number, default: 0},
    expiresAt: {type: Number, default: null},
    maxUses: {type: Number, default: null},
    redeemedBy: {type: [Number], default: []},
    createdBy: Number,
    deletedAt: {type: Number, default: null},
}, {timestamps: true, versionKey: false});

export default mongoose.models.PromoCode || mongoose.model('PromoCode', PromoCodeSchema, 'promo_codes');
