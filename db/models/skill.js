import mongoose from 'mongoose';
const { Schema, model, Types } = mongoose;

const SkillSchema = new Schema(
    {
        name: { type: String, required: true },            // "Точный выстрел"
        description: { type: String },

        // К какому классу относится умение
        class: { type: Types.ObjectId, ref: 'GameClass', index: true, required: true },

        // Позиция в панели умений (0/1/2)
        slot: { type: Number, min: 0, max: 8, required: true },

        // Общие флаги (как в данных)
        effect: {
            type: String,
            enum: ['common_attack','strong_attack','magic_attack','heal','shield','vampire'],
            required: true
        },
        cooldown: { type: Number, default: 0 },
        isSelf: { type: Boolean, default: false },
        isDealDamage: { type: Boolean, default: false },
        isHeal: { type: Boolean, default: false },
        isShield: { type: Boolean, default: false },
        isBuff: { type: Boolean, default: false },
        needLvl: { type: Number, default: 1 },

        // Стоимости
        costHp: { type: Number, default: 0 },
        cost:   { type: Number, default: 0 },

        // Параметры эффекта (опциональные, под разные типы)
        damageModifier: { type: Number },  // strong/magic/common/vampire
        healPower:      { type: Number },  // heal (доля 0..1)
        shieldPower:    { type: Number },  // shield (доля 0..1)
        vampirePower:   { type: Number }   // доля 0..1
    },
    { timestamps: true, versionKey: false }
);

// на класс+слот уникальность (у одного класса в слоте одно умение)
SkillSchema.index({ class: 1, slot: 1 }, { unique: true });

module.exports = model('Skill', SkillSchema);