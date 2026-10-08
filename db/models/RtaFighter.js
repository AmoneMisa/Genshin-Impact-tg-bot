import mongoose from 'mongoose';

// A clan member's fighter for the clan RTA (miniapp/clanRta.js): a frozen copy of the combat parts of
// their game, so a battle can be fought while the player is offline and from any chat. The member
// refreshes it with "Обновить бойца" after getting stronger.
const RtaFighterSchema = new mongoose.Schema({
    userId: {type: Number, required: true, unique: true},
    clanId: {type: String, required: true, index: true},
    name: String,
    power: {type: Number, default: 0},
    snapshot: {type: Object, default: {}},
}, {timestamps: true, versionKey: false});

export default mongoose.models.RtaFighter || mongoose.model('RtaFighter', RtaFighterSchema, 'rta_fighters');
