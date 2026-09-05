import mongoose from "mongoose";

const gachaSchema = new mongoose.Schema({
    name: String,
    needLvl: Number,
    translatedName: String,
    freeSpins: Number,
    piecesForFleeCall: Number,
    gradesForSpin: [Object],
    spinCost: Object
});

export default mongoose.model("GachaTemplate", gachaSchema);
