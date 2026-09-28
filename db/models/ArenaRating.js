import mongoose from "mongoose";

const arenaRatingSchema = new mongoose.Schema({
    userId: { type: Number, required: true },
    chatId: { type: Number }, // для common
    mode: { type: String, enum: ["common", "expansion"], required: true },
    rating: { type: Number, default: 1000 }
}, { timestamps: true });

export default mongoose.model("ArenaRating", arenaRatingSchema);
