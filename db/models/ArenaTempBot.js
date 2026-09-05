import mongoose from "mongoose";

const arenaTempBotSchema = new mongoose.Schema({
    name: String,
    rating: { type: Number, default: 1000 },
    stats: Object,
    gameClass: Object
}, { timestamps: true });

export default mongoose.model("ArenaTempBot", arenaTempBotSchema);
