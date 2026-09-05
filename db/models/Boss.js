import mongoose from "mongoose";

const bossSchema = new mongoose.Schema({
    chatId: Number,
    name: String,
    nameCall: { type: String },
    description: String,
    stats: Object,
    skill: Object,
    hp: Number,
    currentHp: Number,
    listOfDamage: { type: Array, default: [] },
    aliveTime: Number
}, { timestamps: true });

export default mongoose.model("Boss", bossSchema);
