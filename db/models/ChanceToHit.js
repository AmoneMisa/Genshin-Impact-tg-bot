import mongoose from "mongoose";

const chanceSchema = new mongoose.Schema({
    value: Number
});

export default mongoose.model("ChanceToHit", chanceSchema);
