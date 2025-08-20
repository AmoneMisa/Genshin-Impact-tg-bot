import mongoose from 'mongoose';

const BossStatsSchema = new mongoose.Schema(
    {
        attack: { type: Number, required: true },
        defence: { type: Number, required: true },
        minDamage: { type: Number, required: true },
        maxDamage: { type: Number, required: true },
        criticalChance: { type: Number, required: true },
        criticalDamage: { type: Number, required: true },
        currentSummons: { type: Number, default: 0 },
        needSummons: { type: Number, default: 0 },
        lvl: { type: Number, default: 1 },
    },
    { _id: false }
);

const BossSkillSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: { type: String, default: '' },
        effect: { type: String, required: true },
    },
    { _id: false }
);

const DamageEntrySchema = new mongoose.Schema(
    {
        userId: { type: String },
        damage: { type: Number },
        at: { type: Number, default: () => Date.now() },
    },
    { _id: false }
);

const BossSchema = new mongoose.Schema(
    {
        chatId: { type: String, required: true, index: true },
        name: { type: String, required: true },
        nameCall: { type: String, required: true },
        description: { type: String, default: '' },

        availableSkills: { type: [String], default: [] },
        stats: { type: BossStatsSchema, required: true },
        skill: { type: BossSkillSchema, required: true },

        listOfDamage: { type: [DamageEntrySchema], default: [] },

        hp: { type: Number, required: true },
        currentHp: { type: Number, required: true },
        aliveTime: { type: Number, required: true },
        isAlive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

BossSchema.index({ chatId: 1, name: 1 });

export default mongoose.models.Boss || mongoose.model('Boss', BossSchema);