import mongoose from "mongoose";

const potionSchema = new mongoose.Schema({
    type: String,          // hp/mp
    bottleType: String,    // potion/elixir
    size: String,          // little/small/medium
    count: Number,
    power: Number,
    name: String,
    description: String
});

export default mongoose.model("Potion", potionSchema);
