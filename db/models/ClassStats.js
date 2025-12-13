import mongoose from "mongoose";

const classStatsSchema = new mongoose.Schema({
    name: { type: String, required: true },
    translateName: String,
    attack: Number,
    defence: Number,
    criticalChance: Number,
    criticalDamage: Number,
    maxHp: Number,
    maxMp: Number,
    maxCp: Number,
    speed: Number,
    block: Number,
    accuracy: Number,
    evasion: Number
});

export default mongoose.model("ClassStats", classStatsSchema);
