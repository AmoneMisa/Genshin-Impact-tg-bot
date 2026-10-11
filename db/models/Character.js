import mongoose from "mongoose";

// One hero per Telegram user for ALL chats. The member records of Chat keep a working copy of it (the code reads
// chat.members[].game everywhere); functions/general/characterSync.js keeps the copies and this record equal.
const characterSchema = new mongoose.Schema({
    userId: { type: Number, required: true, unique: true },
    // Grows with every write: a copy that was loaded at an older revision is stale.
    rev: { type: Number, default: 1 },
    // The shared part of a member: game, sword, chest and timer fields (see SHARED_KEYS in characterSync.js).
    data: { type: Object, default: {} },
    hash: String,
    // The characters this user had in other chats before the merge, kept so nothing is ever lost.
    archive: { type: Array, default: [] },
}, { timestamps: true, minimize: false });

characterSchema.index({ "data.game.party.id": 1 });

export default mongoose.model("Character", characterSchema);
