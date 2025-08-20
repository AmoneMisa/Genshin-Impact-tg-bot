import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const StatsSchema = new Schema(
    {
        // базовые/описательные поля класса
        name: { type: String, required: true },           // "archer"
        translateName: { type: String, required: true },  // "Лучник"
        description: { type: String },

        // Базовые характеристики (не обязательно на фикс. уровне; это «профиль» класса)
        attack: Number,
        defence: Number,
        criticalChance: Number,
        criticalDamage: Number,
        incomingDamageModifier: Number,
        additionalDamageMul: Number,
        speed: Number,
        block: Number,
        accuracy: Number,
        evasion: Number
    },
    { _id: false }
);

const GameClassSchema = new Schema(
    {
        key: { type: String, required: true, unique: true, index: true }, // "archer" | "mage" | "priest" | "warrior"
        stats: StatsSchema
    },
    { timestamps: true, versionKey: false }
);

module.exports = model('GameClass', GameClassSchema);