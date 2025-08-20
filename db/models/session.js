import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const SessionSchema = new Schema({
    chatId: { type: String, index: true, required: true },
    userId: { type: String, index: true, required: true },
    isHided: { type: Boolean, default: false },
    user: {
        nickName: String, name: String, age: Number, gender: String,
        mostHatedCharacter: String, gameId: String, rank: String,
        bestCharacter: String, favoriteCharacter: String, inGameExp: String,
        lvlOfWorld: String, favoriteElement: String, favoriteLocation: String,
        mostWishesCharacter: String, achievementsCount: Number
    },
    gender: { type: String, default: 'male' },
    userChatData: { type: Schema.Types.Mixed },
    whatsNewSettings: {
        flag: { type: Number, default: 0 },
        button: { text: String, callback_data: String }
    },
    horoscope: {
        sign: { type: String, default: 'aries' },
        style: { type: String, default: 'cheeky' },
    },
    game: { type: Schema.Types.Mixed, default: {} },
    respawnTime: { type: Number, default: 0 },
    shopTimers: { type: Schema.Types.Mixed, default: {} },
    stats: { type: Schema.Types.Mixed, default: {} },
    stealImmuneTimer: { type: Number, default: 0 },
    sword: { type: Schema.Types.Mixed, default: null },
    timerSwordCallback: { type: Number, default: 0 },
    chestTries: { type: Number, default: 0 },
    chestCounter: { type: Number, default: 0 },
    chosenChests: { type: [Schema.Types.Mixed], default: [] },
    chestButtons: { type: [Schema.Types.Mixed], default: [] },

}, { timestamps: true, versionKey: false });

SessionSchema.index({ chatId: 1, userId: 1 }, { unique: true });
SessionSchema.index({ chatId: 1, 'game.inventory.gold': -1 });
SessionSchema.index({ chatId: 1, 'stats.lvl': -1 });

export const Session = model('Session', SessionSchema);