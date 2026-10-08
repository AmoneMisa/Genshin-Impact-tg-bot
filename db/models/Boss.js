import mongoose from "mongoose";

const bossSchema = new mongoose.Schema({
    chatId: Number,
    name: String,
    nameCall: { type: String },
    description: String,
    stats: Object,
    skill: Object,
    hp: Number,
    currentHp: Number,
    listOfDamage: { type: Array, default: [] },
    aliveTime: Number,
    // Live combat: the boss's latest casts and when it acts next.
    lastAttack: Object,
    attackLog: { type: Array, default: [] },
    nextAttackAt: Number,
    // Encounter state (see functions/game/boss): minions fighting beside the boss,
    // phases already fired, enrage bonus (+share of damage), stun / debuffs put on
    // it by players, the ultimate it is charging and recent fight events.
    minions: { type: Array, default: [] },
    minionClock: { type: Object, default: {} },
    phaseIndex: { type: Number, default: 0 },
    enrage: { type: Number, default: 0 },
    stunUntil: { type: Number, default: 0 },
    stunImmuneUntil: { type: Number, default: 0 },
    debuffs: { type: Array, default: [] },
    charging: Object,
    castCount: { type: Number, default: 0 },
    eventLog: { type: Array, default: [] }
}, { timestamps: true });

export default mongoose.model("Boss", bossSchema);
