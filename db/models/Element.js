import mongoose from "mongoose";

const elementSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: String
});

export default mongoose.model("Element", elementSchema);
