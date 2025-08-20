import mongoose from 'mongoose';

const ArenaCommonRatingSchema = new mongoose.Schema(
    {
        chatId: { type: String, required: true, index: true },
        userId: { type: String, required: true, index: true },
        rating: { type: Number, required: true, default: 1000 },
    },
    { timestamps: true }
);

ArenaCommonRatingSchema.index({ chatId: 1, userId: 1 }, { unique: true });

export default mongoose.models.ArenaCommonRating
|| mongoose.model('ArenaCommonRating', ArenaCommonRatingSchema);