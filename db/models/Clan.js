import mongoose from "mongoose";

/**
 * Clan / guild model.
 *
 * A clan is global (not tied to a single chat) — members are matched by their
 * telegram userId, mirroring how the old JSON `clans` structure and getClan()
 * worked. The schema is designed to host the planned clan activities:
 *   - quiz      : daily routine questions
 *   - boss      : shared clan boss
 *   - pvp       : friendly internal player-vs-player
 *   - shop      : clan store
 *   - upgrades  : clan-wide / character improvements
 *   - guildWar  : clan-vs-clan war state
 *
 * Activity payloads are kept as flexible Mixed (Object) sub-documents so each
 * feature can evolve independently without a schema migration. Like the Chat
 * model, a pre-save hook marks those Mixed paths modified so nested mutations
 * are always persisted.
 */

const memberSchema = new mongoose.Schema({
    userId: { type: Number, required: true },
    role: { type: String, enum: ["owner", "officer", "member"], default: "member" },
    contribution: { type: Number, default: 0 }, // total resources/points contributed
    // Personal character improvements ({ track: level }). Applied only inside
    // clan activities (currently clan boss combat) to avoid touching the global
    // stat pipeline. Mixed → persisted via the markModified("members") in the hook.
    upgrades: { type: Object, default: {} },
    lastShopAt: { type: Number, default: 0 }, // timestamp of last clan-shop purchase (weekly limit)
    joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const clanSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    tag: { type: String }, // short display tag, e.g. [ABC]
    description: { type: String, default: "" },
    owner: { type: Number, required: true }, // telegram userId of the founder
    members: { type: [memberSchema], default: [] },

    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    reputation: { type: Number, default: 0 },

    // Requirements for joining (see template/clanApplicationConditionsTemplate.js)
    entryConditions: {
        type: Object,
        default: {
            entryType: 0,     // 0 - free, 1 - by application, -1 - closed
            minGearScore: 0,
            allowedClass: "",
            allowedGender: "",
            minLevel: 0
        }
    },
    // Pending join requests when entryType === 1
    applications: { type: [Number], default: [] }, // telegram userIds

    // Shared resource storage
    warehouse: {
        type: Object,
        default: { gold: 0, crystals: 0, ironOre: 0 }
    },

    // Clan buildings; drives upgrades / reputation calculation
    buildings: {
        type: Object,
        default: { mainHall: { level: 1 } }
    },

    // ---- Activity state (built out incrementally) ----
    quiz: {
        type: Object,
        default: { lastResetAt: 0, questionIndex: 0, participants: {} }
    },
    boss: {
        type: Object,
        default: null // { name, hp, currentHp, stats, damageByUser: {} }
    },
    pvp: {
        type: Object,
        default: { ladder: [] } // internal friendly PvP standings
    },
    shop: {
        type: Object,
        default: { items: [] }
    },
    upgrades: {
        type: Object,
        default: {} // clan-wide bonuses / character improvement tiers
    },
    guildWar: {
        type: Object,
        default: null // { opponentClanId, startedAt, scores: {} }
    },

    // Cooperative, multi-day research: the clan funds one project at a time from
    // the shared warehouse; completing it (full cost funded + duration elapsed)
    // unlocks a permanent clan-wide bonus (see dictionaries/clanInvestigations.js).
    investigations: {
        type: Object,
        default: { active: null, completed: [] }
        // active: { key, progress: { gold, crystals, ironOre }, startedAt }
    },

    // Daily per-member task checklist, separate from the quiz (see
    // dictionaries/clanTasks.js). Reset once a day by resetClanTasks.js.
    tasks: {
        type: Object,
        default: { lastResetAt: 0, progress: {}, claimed: {} }
        // progress[userId] = { taskKey: true }; claimed[userId] = [taskKey, ...]
    },

    // Moderation bookkeeping (e.g. per-actor kick cooldowns) that doesn't belong
    // to any single activity above.
    moderation: {
        type: Object,
        default: {}
    }
}, { timestamps: true });

// Fast lookup of "which clan is this user in" (getClan).
clanSchema.index({ "members.userId": 1 });

// Mixed sub-paths are not deep-tracked by Mongoose; force them modified on save.
clanSchema.pre("save", function () {
    this.markModified("members"); // covers members[].upgrades (Mixed)
    this.markModified("entryConditions");
    this.markModified("warehouse");
    this.markModified("buildings");
    this.markModified("quiz");
    this.markModified("boss");
    this.markModified("pvp");
    this.markModified("shop");
    this.markModified("upgrades");
    this.markModified("guildWar");
    this.markModified("investigations");
    this.markModified("tasks");
    this.markModified("moderation");
});

export default mongoose.model("Clan", clanSchema);
