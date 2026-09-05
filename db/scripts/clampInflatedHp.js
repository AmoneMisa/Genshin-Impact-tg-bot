import mongoose from "mongoose";
import process from "node:process";
import Chat from "../models/Chat.js";
import getMaxHp from "../../functions/game/player/getters/getMaxHp.js";

/**
 * One-off data fix for a heal-skill bug (callbacks/game/player/userSkillsCallback.js)
 * that used Math.max instead of Math.min when applying heal-skill healing, letting
 * a player's stored `game.gameClass.stats.hp` grow without bound (e.g. 99999999)
 * every time they used the skill while already near/at max HP.
 *
 * This script clamps every member's stored hp down to their real max HP. It is
 * idempotent and safe to re-run: members already within bounds are left untouched
 * and not saved.
 *
 * Usage: node db/scripts/clampInflatedHp.js
 */
process.loadEnvFile('.env');
const MONGO_URI = process.env.MONGO_URL;

async function run() {
    await mongoose.connect(MONGO_URI);

    const chats = await Chat.find({});
    let scannedMembers = 0;
    let fixedMembers = 0;
    let fixedChats = 0;

    for (const chat of chats) {
        let chatChanged = false;

        for (const member of chat.members || []) {
            const stats = member.game?.gameClass?.stats;
            if (!stats || typeof stats.hp !== "number") {
                continue;
            }
            scannedMembers++;

            const maxHp = getMaxHp(member, member.game.gameClass);
            if (stats.hp > maxHp) {
                console.log(`Chat ${chat._id} member ${member.userId}: hp ${stats.hp} -> ${maxHp}`);
                stats.hp = maxHp;
                chatChanged = true;
                fixedMembers++;
            }
        }

        if (chatChanged) {
            chat.markModified("members");
            await chat.save();
            fixedChats++;
        }
    }

    console.log(`Scanned ${scannedMembers} members across ${chats.length} chats.`);
    console.log(`Fixed ${fixedMembers} members across ${fixedChats} chats.`);

    await mongoose.disconnect();
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
