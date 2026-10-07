import mongoose from 'mongoose';

// One document per game template (class stats, builds, equipment ...), see db/templates.js.
// `data` is the template exactly as the code uses it, so it round-trips losslessly.
const GameTemplateSchema = new mongoose.Schema({
    _id: {type: String, required: true},
    seedVersion: {type: Number, required: true},
    seedHash: {type: String, required: true},
    data: {type: mongoose.Schema.Types.Mixed, required: true},
    updatedAt: {type: Date, default: Date.now},
}, {minimize: false, versionKey: false});

export default mongoose.models.GameTemplate || mongoose.model('GameTemplate', GameTemplateSchema, 'game_templates');
