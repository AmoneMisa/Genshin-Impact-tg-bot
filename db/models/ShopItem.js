import mongoose from "mongoose";

const shopItemSchema = new mongoose.Schema({
    name: String,
    cost: Number,
    time: Number,
    command: String,
    message: String,
    category: String,
    type: String
});

export default mongoose.model("ShopItem", shopItemSchema);
