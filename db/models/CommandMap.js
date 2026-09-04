import mongoose from "mongoose";

const commandSchema = new mongoose.Schema({
    command: {
        type: String,
        required: true,
        index: true
    },
    settingKey: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ""
    },
    enabled: {
        type: Boolean,
        default: true
    },
    supergroupOnly: {
        type: Boolean,
        default: false // если true — команда доступна только в супергруппах
    }
}, {
    timestamps: true
});

export default mongoose.model("Command", commandSchema);
