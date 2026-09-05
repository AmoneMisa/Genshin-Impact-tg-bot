import CommandMap from "../models/CommandMap.js";

export const COMMAND_MAP = Object.freeze({
    "boss": "boss",
    "shop": "boss",
    "exchange": "boss",
    "gacha": "whoami",
    "steal_resources": "whoami",
    "whoami": "whoami",
    "change_gender": "whoami",
    "send_gold": "sendGold",
    "sword": "swords",
    "swords": "swords",
    "self_mute": "mute",
    "slots": "slots",
    "point": "points",
    "dice": "dice",
    "darts": "darts",
    "bowling": "bowling",
    "basketball": "basketball",
    "football": "football",
    "elements": "elements",
    "horoscope": "horoscope",
    "bonus": "bonus",
    "chest": "chests",
    "title": "titles",
    "titles": "titles",
    "info": "form",
    "form": "form",
    "set[A-Z].*": "form"
});

export const SUPERGROUP_COMMANDS = Object.freeze([
    "boss", "title", "titles", "info", "form", "sword", "swords",
    "shop", "send_gold", "self_mute", "steal_resources", "gacha",
    "exchange", "change_gender", "bonus"
]);

const SUPERGROUP_COMMAND_SET = new Set(SUPERGROUP_COMMANDS);

export function buildCommandMapDocuments() {
    return Object.entries(COMMAND_MAP).map(([command, settingKey]) => ({
        command,
        settingKey,
        supergroupOnly: SUPERGROUP_COMMAND_SET.has(command)
    }));
}

export default async function importCommandMap() {
    const docs = buildCommandMapDocuments();

    // Sync on every startup rather than only on first import. Older imports wrote
    // `isSupergroupCommand`, while the schema/runtime read `supergroupOnly`.
    // Idempotent upserts repair existing installations without replacing any
    // unrelated per-command fields such as `enabled` or `description`.
    await CommandMap.bulkWrite(docs.map(({ command, settingKey, supergroupOnly }) => ({
        updateOne: {
            filter: { command },
            update: {
                $set: { settingKey, supergroupOnly },
                $setOnInsert: { enabled: true }
            },
            upsert: true
        }
    })));

    console.log(`✅ Synced ${CommandMap.collection.name}`);
}
