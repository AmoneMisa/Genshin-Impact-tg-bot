import mongoose from "mongoose";

// Player sessions predate the Mongo migration and contain a large amount of
// feature-specific runtime state (chests, sword, horoscope, timers, etc.).
// Keep the stable fields typed, but allow legacy feature fields to survive
// round-trips while individual systems are migrated to first-class schemas.
const memberSchema = new mongoose.Schema({
    userId: {type: Number, required: true},
    isHided: {type: Boolean, default: false},
    game: {type: mongoose.Schema.Types.Mixed, default: () => ({})}
}, {
    _id: false,
    strict: false,
    minimize: false
});

const chatSchema = new mongoose.Schema({
    chatId: { type: Number, required: true, unique: true },
    bossSettings: Object,
    game: {type: mongoose.Schema.Types.Mixed, default: () => ({})},
    members: {type: [memberSchema], default: () => []}
}, {
    timestamps: true,
    minimize: false
});

export default mongoose.model("Chat", chatSchema);
