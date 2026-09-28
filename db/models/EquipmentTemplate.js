import mongoose from "mongoose";

const equipmentTemplateSchema = new mongoose.Schema({
    grades: [Object],
    rarity: [Object],
    itemType: [Object]
});

export default mongoose.model("EquipmentTemplate", equipmentTemplateSchema);
