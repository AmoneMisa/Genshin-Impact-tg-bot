import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const UserSchema = new Schema({
    _id: { type: String },
    username: String,
    first_name: String,
    last_name: String,
    language_code: String,
    is_premium: Boolean,
    is_bot: Boolean,
}, { timestamps: true, versionKey: false });

export const TgUser = model('user', UserSchema);