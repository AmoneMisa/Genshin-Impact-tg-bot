import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    chatId: { type: Number, required: true, unique: true },
    bossSettings: Object,
    game: {type: Object, default: {}},
    members: [{
        userId: {type: Number},
        isHided: Boolean,
        game: {
            type: Object,
            default: {
                stats: {type: Object, default: {}},
                gameClass: {type: Object, default: {}},
                builds: {type: Object, default: {}},
                inventory: {type: Object, default: {}},
                arenaChances: Number,
                arenaExpansionChances: Number
            }
        }
    }]
}, { timestamps: true });

export default mongoose.model("Chat", chatSchema);
