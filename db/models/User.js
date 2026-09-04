import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userId: { type: Number, required: true, unique: true },
    nickName: String,
    name: String,
    age: Number,
    gender: String,
    userChatData: {
        user: {
            id: Number,
            username: String,
            first_name: String,
            language_code: String
        },
        status: String // "member", "administrator", "creator"
    }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
