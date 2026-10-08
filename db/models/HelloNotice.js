import mongoose from 'mongoose';

// Admin-written popups shown when the Mini App opens (miniapp/promo.js).
const HelloNoticeSchema = new mongoose.Schema({
    title: {type: String, required: true},
    body: {type: String, required: true},
    active: {type: Boolean, default: true},
    startsAt: {type: Number, default: null},
    endsAt: {type: Number, default: null},
    createdBy: Number,
}, {timestamps: true, versionKey: false});

export default mongoose.models.HelloNotice || mongoose.model('HelloNotice', HelloNoticeSchema, 'hello_notices');
