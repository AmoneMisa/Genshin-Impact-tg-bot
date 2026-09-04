import mongoose from "mongoose";

const equipmentBonusStatsSchema = new mongoose.Schema({
    statName: String,
    options: [{
        chance: Number,
        value: Object
    }]
});

export default mongoose.model("EquipmentBonusStats", equipmentBonusStatsSchema);
