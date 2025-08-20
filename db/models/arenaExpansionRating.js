import mongoose from 'mongoose';

const ArenaExpansionRatingSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, unique: true, index: true },
        rating: { type: Number, required: true, default: 1000 },
    },
    { timestamps: true }
);

export default mongoose.models.ArenaExpansionRating
|| mongoose.model('ArenaExpansionRating', ArenaExpansionRatingSchema);