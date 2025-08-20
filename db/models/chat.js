import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const ChatSchema = new Schema({
    _id: { type: String }, // chatId как строка
    game: {
        points: { type: Schema.Types.Mixed, default: {} },
        elements: { type: Schema.Types.Mixed, default: {} },
    },
    bossSettings: {
        showDamageMessage: { type: Number, default: 1 },
        showHealMessage: { type: Number, default: 1 },
    },
    ui: {
        settingsMessageId: { type: String, default: null },
        settingsButtons: { type: [[{ text: String, callback_data: String }]], default: undefined },
        bossSettingsMessageId: { type: String, default: null },
        bossSettingsButtons: { type: [[{ text: String, callback_data: String }]], default: undefined },
    },
}, { timestamps: true, versionKey: false });

export const Chat = model('Chat', ChatSchema);