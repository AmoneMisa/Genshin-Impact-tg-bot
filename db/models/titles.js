import mongoose from 'mongoose';

const ChatTitlesSchema = new mongoose.Schema(
    {
        chatId: { type: String, required: true, unique: true, index: true },
        titles: { type: [String], default: [] },
    },
    { timestamps: true }
);

ChatTitlesSchema.index({ chatId: 1 }, { unique: true });

export default mongoose.models.ChatTitles
|| mongoose.model('ChatTitles', ChatTitlesSchema);