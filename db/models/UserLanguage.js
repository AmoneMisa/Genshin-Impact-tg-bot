import mongoose from 'mongoose';

// Interface language of a Telegram user (ru | uz), reported by the Mini App.
// Used to translate pushes and bot messages sent outside the app.
const UserLanguageSchema = new mongoose.Schema({
    userId: {type: Number, required: true, unique: true},
    lang: {type: String, enum: ['ru', 'uz'], default: 'ru'},
}, {timestamps: true, versionKey: false});

export default mongoose.models.UserLanguage || mongoose.model('UserLanguage', UserLanguageSchema, 'user_languages');
