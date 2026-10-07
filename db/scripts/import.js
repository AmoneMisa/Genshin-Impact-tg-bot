import mongoose from "mongoose";
import fs from "fs";
import process from 'node:process'

process.loadEnvFile('.env');
const MONGO_URI = process.env.MONGO_URL;
// 1. Подключение к MongoDB
mongoose.connect(MONGO_URI);

const User = mongoose.model("users", new mongoose.Schema({}, {strict: false}));
const Chat = mongoose.model("chats", new mongoose.Schema({}, {strict: false}));
const Boss = mongoose.model("bosses", new mongoose.Schema({}, {strict: false}));
const ChatSettings = mongoose.model("chatSettings", new mongoose.Schema({}, {strict: false}));
const ArenaRatings = mongoose.model("arenaRatings", new mongoose.Schema({}, {strict: false}));

// 3. Загрузка JSON
const sessions = JSON.parse(fs.readFileSync("./sessions.json", "utf-8"));
const bosses = JSON.parse(fs.readFileSync("./bosses.json", "utf-8"));
const arenaRating = JSON.parse(fs.readFileSync("./arenaRating.json", "utf-8"));

// Игровые шаблоны больше не импортируются сюда: см. db/templates.js (коллекция game_templates).
import importCommandMap from "./commandMapImport.js";

// 5. Импорт пользователей и чатов
async function importSessions() {


    for (const [chatId, session] of Object.entries(sessions)) {
        const members = [];

        for (const [memberId, memberData] of Object.entries(session.members)) {
            // --- USERS ---
            if (!(await isTemplateCollectionImported(User.collection.name))) {
                await User.updateOne(
                    {userId: Number(memberId)},
                    {
                        $set: {
                            userId: Number(memberId),
                            nickName: memberData.user.nickName,
                            name: memberData.user.name,
                            age: memberData.user.age,
                            gender: memberData.gender,
                            userChatData: memberData.userChatData,
                        },
                    },
                    {upsert: true}
                );
                console.log(`✅ Imported ${User.collection.name}`);
            }

            // --- CHATS.members ---
            if (!(await isTemplateCollectionImported(Chat.collection.name))) {
                members.push({
                    userId: Number(memberId),
                    isHided: memberData.isHided,
                    stats: memberData.game?.stats || {},
                    gameClass: memberData.game?.gameClass || {},
                    builds: memberData.game?.builds || {},
                    inventory: memberData.game?.inventory || {},
                    arenaChances: memberData.game?.arenaChances,
                    arenaExpansionChances: memberData.game?.arenaExpansionChances,
                });
                console.log(`✅ Imported ${Chat.collection.name}`);

                // --- CHATS ---
                await Chat.updateOne(
                    {chatId: Number(chatId)},
                    {
                        $set: {
                            chatId: Number(chatId),
                            bossSettings: session.bossSettings,
                            game: session.game,
                            members: members,
                        },
                    },
                    {upsert: true}
                );
            }
        }

        // --- CHAT SETTINGS ---
        if (!(await isTemplateCollectionImported(ChatSettings.collection.name))) {
            const settingsTemplate = {
                dice: 1, chests: 1, boss: 1, form: 1, sendGold: 1, points: 1, elements: 1,
                bowling: 1, football: 1, basketball: 1, darts: 1, slots: 1, swords: 1,
                titles: 1, whoami: 1, mute: 1, horoscope: 1, bonus: 1
            };

            await ChatSettings.updateOne(
                {chatId: Number(chatId)},
                {$set: {chatId: Number(chatId), settings: {...settingsTemplate, ...session.settings}}},
                {upsert: true}
            );
            console.log(`✅ Imported ${ChatSettings.collection.name}`);
        }
    }
}

// 6. Импорт боссов
async function importBosses() {
    if (!(await isTemplateCollectionImported(Boss.collection.name))) {
        for (const [chatId, bossList] of Object.entries(bosses)) {
            for (const boss of bossList) {
                await Boss.insertOne({chatId: Number(chatId), ...boss});
            }
        }
        console.log(`✅ Imported ${Boss.collection.name}`);
    }
}

// 7. Импорт рейтингов арены (данные игроков, не шаблон)
async function importArenaRatings() {
    if (!(await isTemplateCollectionImported(ArenaRatings.collection.name))) {
        // arenaRating.json → плоская структура
        for (const [mode, ratings] of Object.entries(arenaRating)) {
            for (const [chatId, userRatings] of Object.entries(ratings)) {
                for (const [userId, rating] of Object.entries(userRatings)) {
                    await ArenaRatings.insertOne({
                        chatId: Number(chatId),
                        userId: Number(userId),
                        mode,
                        rating
                    });
                }
            }
        }
        console.log(`✅ Imported: ${ArenaRatings.collection.name}`);
    }
}

async function ensureIndex(collection, keys, options) {
    const existing = await collection.indexes();
    const name = options?.name || Object.keys(keys).join("_") + "_1";
    if (!existing.find(idx => idx.name === name)) {
        await collection.createIndex(keys, options);
    }
}

// 8. Запуск
export default async function main() {
    await importSessions();
    await importBosses();
    await importArenaRatings();
    await importCommandMap();

    await ensureIndex(User.collection, {userId: 1}, {unique: true, name: "userId_1"});
    await ensureIndex(Chat.collection, {chatId: 1}, {unique: true, name: "chatId_1"});
    await ensureIndex(Boss.collection, {chatId: 1}, {name: "chatId_1"});
    await ensureIndex(ArenaRatings.collection, {chatId: 1, userId: 1}, {name: "chatId_userId_1"});

    console.log("🎉 All data imported!");
}


async function isCollectionExists(name) {
    const client = mongoose.connection.getClient();
    const db = client.db();

    const collections = await db.listCollections().toArray();
    return collections.some(col => col.name.toLowerCase() === name.toLowerCase());
}

async function isCollectionNotEmpty(name) {
    const client = mongoose.connection.getClient();
    const db = client.db();

    const count = await db.collection(name).estimatedDocumentCount();
    return count > 0;
}

export async function isTemplateCollectionImported(name) {
    return await isCollectionExists(name) && await isCollectionNotEmpty(name);
}
