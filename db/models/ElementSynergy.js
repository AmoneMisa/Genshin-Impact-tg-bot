import mongoose from "mongoose";

const synergySchema = new mongoose.Schema({
    combo: { type: [String], required: true }
});

export default mongoose.model("ElementSynergy", synergySchema);
