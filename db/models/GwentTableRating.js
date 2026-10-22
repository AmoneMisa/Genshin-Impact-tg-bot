import mongoose from 'mongoose';

// The Gwent rating of one player at tables of three and four (miniapp/gwentRating.js): changed only by finished
// tables where every seat was taken by a person. Kept apart from the duel rating (gwent_ratings).
const GwentTableRatingSchema = new mongoose.Schema({
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
GwentTableRatingSchema.index({rating: -1});

export default mongoose.models.GwentTableRating || mongoose.model('GwentTableRating', GwentTableRatingSchema, 'gwent_table_ratings');
