import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userId: { type: Number, required: true, unique: true },
    nickName: String,
    name: String,
    age: Number,
    gender: String,
    // Raw Telegram getChatMember payload ({ user: {...}, status }). Stored as Mixed
    // so fields like user.is_bot survive instead of being stripped by strict mode.
    userChatData: { type: Object, default: {} }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
