import mongoose from "mongoose";
import fs from "fs";
import process from 'node:process'

process.loadEnvFile('.env');
const MONGO_URI = process.env.MONGO_URL;
// 1. Подключение к MongoDB
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const User = mongoose.model("users", new mongoose.Schema({}, {strict: false}));
const Chat = mongoose.model("chats", new mongoose.Schema({}, {strict: false}));
const Boss = mongoose.model("bosses", new mongoose.Schema({}, {strict: false}));
const ChatSettings = mongoose.model("chatSettings", new mongoose.Schema({}, {strict: false}));
const ClassStats = mongoose.model("classStats", new mongoose.Schema({}, {strict: false}));
const ClassSkills = mongoose.model("classSkills", new mongoose.Schema({}, {strict: false}));
const ArenaRatings = mongoose.model("arenaRatings", new mongoose.Schema({}, {strict: false}));
const ArenaPrizes = mongoose.model("arenaPrizes", new mongoose.Schema({}, {strict: false}));
const Builds = mongoose.model("buildings", new mongoose.Schema({}, {strict: false}));
const BossLoot = mongoose.model("bossLoot", new mongoose.Schema({}, {strict: false}));
const Shop = mongoose.model("shop", new mongoose.Schema({}, {strict: false}));
const Potions = mongoose.model("potions", new mongoose.Schema({}, {strict: false}));
const EquipmentTemplate = mongoose.model("equipmentTemplate", new mongoose.Schema({}, {strict: false}));
const EquipmentBonusStats = mongoose.model("equipmentBonusStats", new mongoose.Schema({}, {strict: false}));
const Elements = mongoose.model("elements", new mongoose.Schema({}, {strict: false}));
const ElementsSynergy = mongoose.model("elementsSynergy", new mongoose.Schema({}, {strict: false}));
const ChanceToHit = mongoose.model("chanceToHit", new mongoose.Schema({}, {strict: false}));
const GachaTemplate = mongoose.model("gachaTemplate", new mongoose.Schema({}, {strict: false}));

// 3. Загрузка JSON
const sessions = JSON.parse(fs.readFileSync("./sessions.json", "utf-8"));
const bosses = JSON.parse(fs.readFileSync("./bosses.json", "utf-8"));
const arenaRating = JSON.parse(fs.readFileSync("./arenaRating.json", "utf-8"));

// 4. Загрузка JS‑шаблонов
import classStats from "../../template/classStatsTemplate.js";
import classSkills from "../../template/classSkillsTemplate.js";
import arenaWeeklyPrizes from "../../template/arenaWeeklyPrizes.js";
import builds from "../../template/buildsTemplate.js";
import bossLoot from "../../template/bossLootTemplate.js";
import shop from "../../template/shopTemplate.js";
import potions from "../../template/potionsInInventoryTemplate.js";
import equipmentTemplate from "../../template/equipmentTemplate.js";
import equipmentBonusStats from "../../template/equipmentBonusStatsTemplate.js";
import elements from "../../template/elements.js";
import elementsSynergy from "../../template/elementsSynergy.js";
import chanceToHit from "../../template/chanceToHitTemplate.js";
import gachaTemplate from "../../template/gachaTemplate.js";
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

// 7. Импорт классов, арены и игровых систем
async function importGameTemplates() {
    if (!(await isTemplateCollectionImported(ClassStats.collection.name))) {
        await ClassStats.insertMany(classStats);
        console.log(`✅ Imported: ${ClassStats.collection.name}`);
    }

    if (!(await isTemplateCollectionImported(ClassSkills.collection.name))) {
        await ClassSkills.insertMany(Object.entries(classSkills).map(([cls, skills]) => ({class: cls, skills})));
        console.log(`✅ Imported: ${ClassSkills.collection.name}`);
    }

    if (!(await isTemplateCollectionImported(ArenaPrizes.collection.name))) {
        await ArenaPrizes.insertMany(arenaWeeklyPrizes);
        console.log(`✅ Imported: ${ArenaPrizes.collection.name}`);
    }

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

    if (!(await isTemplateCollectionImported(Builds.collection.name))) {
        await Builds.insertOne(builds);
        console.log(`✅ Imported: ${Builds.collection.name}`);
    }

    if (!(await isTemplateCollectionImported(BossLoot.collection.name))) {
        await BossLoot.insertOne(bossLoot);
        console.log(`✅ Imported: ${BossLoot.collection.name}`);
    }

    if (!(await isTemplateCollectionImported(Shop.collection.name))) {
        await Shop.insertMany(shop);
        console.log(`✅ Imported: ${Shop.collection.name}`);
    }

    if (!(await isTemplateCollectionImported(Potions.collection.name))) {
        await Potions.insertMany(potions);
        console.log(`✅ Imported: ${Potions.collection.name}`);
    }

    if (!(await isTemplateCollectionImported(EquipmentTemplate.collection.name))) {
        await EquipmentTemplate.insertOne(equipmentTemplate);
        console.log(`✅ Imported: ${EquipmentTemplate.collection.name}`);
    }

    if (!(await isTemplateCollectionImported(EquipmentBonusStats.collection.name))) {
        await EquipmentBonusStats.insertOne(equipmentBonusStats);
        console.log(`✅ Imported: ${EquipmentBonusStats.collection.name}`);
    }

    if (!(await isTemplateCollectionImported(Elements.collection.name))) {
        await Elements.insertMany(elements.map(e => ({name: e})));
        console.log(`✅ Imported: ${Elements.collection.name}`);
    }

    if (!(await isTemplateCollectionImported(ElementsSynergy.collection.name))) {
        await ElementsSynergy.insertMany(elementsSynergy.map(combo => ({combo})));
        console.log(`✅ Imported: ${ElementsSynergy.collection.name}`);
    }

    if (!(await isTemplateCollectionImported(ChanceToHit.collection.name))) {
        await ChanceToHit.insertMany(chanceToHit.map(v => ({value: v})));
        console.log(`✅ Imported: ${ChanceToHit.collection.name}`);
    }

    if (!(await isTemplateCollectionImported(GachaTemplate.collection.name))) {
        await GachaTemplate.insertMany(gachaTemplate);
        console.log(`✅ Imported ${GachaTemplate.collection.name}`);
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
    await importGameTemplates();
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
