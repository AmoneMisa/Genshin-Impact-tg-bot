// One-off migration: one character per Telegram user for ALL chats.
//
//   node db/scripts/mergeCharacters.js            merge (a user that already has a record is left as it is)
//   node db/scripts/mergeCharacters.js --dry-run  only report
//
// For every user that plays in several chats the member with the highest level (then the most recently played chat)
// becomes the shared hero in the `characters` collection; the other copies are kept in its `archive`, nothing is deleted.
// The member records in the chats are not touched: they are replaced by the shared hero the next time a chat loads.
// Run it BEFORE the bot starts with the shared-character code, so no chat creates the record first.
import mongoose from 'mongoose';
import process from 'node:process';
import { SHARED_KEYS, sharedOf, hashOf, pickHero } from '../../functions/general/characterSync.js';

process.loadEnvFile?.('.env');
const dryRun = process.argv.includes('--dry-run');
await mongoose.connect(process.env.MONGO_URL);

const chats = mongoose.connection.collection('chats');
const characters = mongoose.connection.collection('characters');
const levelOf = member => Number(member.game?.stats?.lvl) || 0;

// pass 1: who is the hero of every user
const best = new Map();
const seen = new Map();
for await (const chat of chats.find({}, { projection: { chatId: 1, updatedAt: 1, 'members.userId': 1, 'members.game.stats.lvl': 1, 'members.game.stats.currentExp': 1 } })) {
    for (const member of chat.members || []) {
        if (member.userId === undefined || !member.game) continue;
        const candidate = { chatId: chat.chatId, level: levelOf(member), updatedAt: new Date(chat.updatedAt || 0).getTime() };
        seen.set(member.userId, (seen.get(member.userId) || 0) + 1);
        best.set(member.userId, pickHero([best.get(member.userId), candidate].filter(Boolean)));
    }
}
console.log(`users: ${best.size}, with several chats: ${[...seen.values()].filter(count => count > 1).length}`);
if (dryRun) { await mongoose.disconnect(); process.exit(0); }

// pass 2: write the heroes; pass 3: archive the other copies (the record has to exist by then)
let created = 0, archived = 0;
for (const phase of ['heroes', 'archive']) {
    for await (const chat of chats.find({})) {
        for (const member of chat.members || []) {
            if (member.userId === undefined || !member.game) continue;
            const winner = best.get(member.userId);
            if (!winner) continue;
            const mine = winner.chatId === chat.chatId;
            if (phase === 'heroes' && mine) {
                const data = sharedOf(member);
                const now = new Date();
                const result = await characters.updateOne({ userId: member.userId }, { $setOnInsert: { userId: member.userId, rev: 1, data, hash: hashOf(data), archive: [], createdAt: now, updatedAt: now } }, { upsert: true });
                if (result.upsertedCount) created++;
            } else if (phase === 'archive' && !mine && seen.get(member.userId) > 1) {
                const result = await characters.updateOne({ userId: member.userId, 'archive.chatId': { $ne: chat.chatId } }, { $push: { archive: { chatId: chat.chatId, level: levelOf(member), data: sharedOf(member) } } });
                if (result.modifiedCount) archived++;
            }
        }
    }
}
console.log(`characters created: ${created}, copies archived: ${archived}, shared fields: ${SHARED_KEYS.join(', ')}`);
await mongoose.disconnect();
