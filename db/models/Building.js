import mongoose from "mongoose";

const buildingSchema = new mongoose.Schema({
    name: String,
    description: String,
    type: String,
    startLvl: Number,
    maxLvl: Number,
    productionPerHour: Number,
    upgradeCosts: [Object],
    upgradeRequirements: [Object],
    available: Boolean
});

export default mongoose.model("Building", buildingSchema);
