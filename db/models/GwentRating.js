import mongoose from 'mongoose';

// The Gwent rating of one player (miniapp/gwentRating.js): changed only by finished rated games found
// through the public queue. The leaderboard reads the best ratings of this collection.
const GwentRatingSchema = new mongoose.Schema({
    userId: {type: Number, required: true, unique: true},
    name: {type: String, default: ''},
    rating: {type: Number, default: 1000},
    peak: {type: Number, default: 1000},
    games: {type: Number, default: 0},
    wins: {type: Number, default: 0},
    losses: {type: Number, default: 0},
    draws: {type: Number, default: 0},
    updatedAt: {type: Number, default: 0},
}, {versionKey: false});
GwentRatingSchema.index({rating: -1});

export default mongoose.models.GwentRating || mongoose.model('GwentRating', GwentRatingSchema, 'gwent_ratings');
