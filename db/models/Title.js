import mongoose from "mongoose";

const titleSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    nickname: {
        type: String,
        required: true,
    },
    titleName: {
        type: String,
        required: true,
    },
    obtainedAt: {
        type: Date,
        default: Date.now,
    }
}, {
    timestamps: true
});

export default mongoose.model("Title", titleSchema);
