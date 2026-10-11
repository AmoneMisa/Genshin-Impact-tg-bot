import mongoose from "mongoose";
import { hydrateChats, persistChat } from "../../functions/general/characterSync.js";
import { characterStore } from "../../functions/general/characterStore.js";
import { persistGuests } from "../../functions/general/partyGuests.js";

const chatSchema = new mongoose.Schema({
    chatId: { type: Number, required: true, unique: true },
    bossSettings: Object,
    // Chat-level UI state for boss/settings menus (message ids + rendered button
    // layouts). Declared explicitly so strict mode does not strip them on save.
    bossSettingsMessageId: Number,
    bossSettingsButtons: Array,
    bossMenuMessageId: Number,
    settingsMessageId: Number,
    settingsButtons: Array,
    game: {type: Object, default: {}},
    // When each epic raid boss may be challenged again: {name: {killedAt, respawnAt, kills}} (epicBosses.js).
    epicBosses: {type: Object, default: {}},
    members: [{
        userId: {type: Number},
        // Revision of the shared character this copy was loaded at (characterSync.js).
        syncRev: Number,
        isHided: Boolean,
        gender: String,
        // Denormalized copy of User.userChatData (raw Telegram payload) so hot paths
        // (regen, boss damage, arena) read member.userChatData.user.* without a join.
        userChatData: {type: Object, default: {}},
        // Per-member settings set by getLostFieldsInSession; kept as Mixed so they
        // aren't stripped by strict mode (news broadcast + horoscope features).
        whatsNewSettings: {type: Object, default: {}},
        horoscope: {type: Object, default: {}},
        // Top-level member state for the sword/chest/title mini-games and cooldown
        // timers. Declared explicitly so strict mode does not strip them on save
        // (they live outside member.game and aren't seeded by getLostFieldsInSession).
        sword: Number,
        swordImmune: Boolean,
        immuneToUpSword: Boolean,
        chestCounter: Number,
        chosenChests: Array,
        chestButtons: Array,
        chestTries: Number,
        timerTitleCallback: Number,
        timerSwordCallback: Number,
        changeClassTimer: Number,
        // Personal-info form answers (/form -> /setX) and the last keyboard message
        // shown to the user. Declared so strict mode keeps them on save.
        user: {type: Object, default: {}},
        keyboardMessage: Object,
        game: {
            type: Object,
            default: {
                stats: {type: Object, default: {}},
                gameClass: {type: Object, default: {}},
                builds: {type: Object, default: {}},
                inventory: {type: Object, default: {}},
                arenaChances: Number,
                arenaExpansionChances: Number
            }
        }
    }]
}, { timestamps: true });

// game / members contain Mixed (Object) sub-paths. Mongoose does not track deep
// mutations on Mixed types, so `chat.save()` would silently drop changes made via
// `member.game.x = y`. Force these paths to be serialized on every save.
chatSchema.pre("save", async function () {
    this.markModified("game");
    // One hero for all chats: write the members that changed to the shared record, take the newer ones from it.
    await persistChat(this, characterStore);
    // heroes of a cross-chat party that are not members of this chat
    await persistGuests(this, characterStore);
    this.markModified("members");
});

// ...and every chat that is loaded shows the shared hero in its member records.
for (const operation of ["find", "findOne", "findOneAndUpdate"]) {
    chatSchema.post(operation, async function (result) {
        if (!result) return;
        await hydrateChats(Array.isArray(result) ? result : [result], characterStore);
    });
}

export default mongoose.model("Chat", chatSchema);
