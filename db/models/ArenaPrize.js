import mongoose from "mongoose";

const arenaPrizeSchema = new mongoose.Schema({
    rank: String,
    reward: Number
});

export default mongoose.model("ArenaPrize", arenaPrizeSchema);
