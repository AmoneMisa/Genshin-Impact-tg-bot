const EffectiveStatsSchema = new Schema(
    {
        attack: Number,
        defence: Number,
        criticalChance: Number,
        criticalDamage: Number,
        incomingDamageModifier: Number,
        additionalDamageMul: Number,

        maxHp: Number,
        maxCp: Number,
        maxMp: Number,
        hp: Number,
        cp: Number,
        mp: Number,

        hpRestoreSpeed: Number,
        mpRestoreSpeed: Number,
        cpRestoreSpeed: Number,

        speed: Number,
        block: Number,
        accuracy: Number,
        evasion: Number
    },
    { _id: false }
);

const ArenaTempBotSchema = new Schema(
    {
        name: { type: String, required: true, unique: true },
        level: { type: Number, required: true },   // stats.lvl
        rating: { type: Number, default: 1000 },

        // Ссылка на класс
        class: { type: Types.ObjectId, ref: 'GameClass', required: true, index: true },

        // Набор умений этого бота — как ссылки на справочник умений (по слоту)
        skills: [{ type: Types.ObjectId, ref: 'Skill', index: true }],

        // «Снимок» итоговых статов именно для этого бота на его уровне
        classStatsSnapshot: EffectiveStatsSchema
    },
    {
        timestamps: true,
        versionKey: false,
        collection: 'arena_temp_bots'
    }
);

// Индексы для подбора ботов по уровню/классу/рейтингу
ArenaTempBotSchema.index({ level: 1, class: 1 });
ArenaTempBotSchema.index({ rating: -1 });

module.exports = model('ArenaTempBot', ArenaTempBotSchema);