import mongoose from "mongoose";

const chatSettingsSchema = new mongoose.Schema({
    chatId: { type: Number, required: true, unique: true },
    settings: {
        dice: Number,
        chests: Number,
        boss: Number,
        form: Number,
        sendGold: Number,
        points: Number,
        elements: Number,
        bowling: Number,
        football: Number,
        basketball: Number,
        darts: Number,
        slots: Number,
        swords: Number,
        titles: Number,
        whoami: Number,
        mute: Number,
        horoscope: Number,
        bonus: Number
    }
}, { timestamps: true });

export default mongoose.model("ChatSettings", chatSettingsSchema);
