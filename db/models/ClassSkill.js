import mongoose from "mongoose";

const classSkillSchema = new mongoose.Schema({
    class: { type: String, required: true },
    slot: Number,
    name: String,
    description: String,
    effect: String,
    cooldown: Number,
    cost: Number,
    costHp: Number,
    isDealDamage: Boolean,
    isHeal: Boolean,
    isShield: Boolean,
    isBuff: Boolean,
    needLvl: Number
});

export default mongoose.model("ClassSkill", classSkillSchema);
