import mongoose from "mongoose";

const lootSchema = new mongoose.Schema({
    category: String,   // gold, experience, crystals, equipment
    value: Object,      // { maxAmount, minAmount } или число
    chance: Number
});

export default mongoose.model("BossLoot", lootSchema);
