import CommandMap from "../models/CommandMap.js";
import {isTemplateCollectionImported} from "./import.js";

const commandMap = {
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
    "mute": "mute",
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
};

const supergroupCommands = [
    "boss", "title", "titles", "info", "form", "sword", "swords",
    "shop", "send_gold", "mute", "steal_resources", "gacha",
    "exchange", "change_gender", "bonus"
];

export default async function importCommandMap() {
    if (!(await isTemplateCollectionImported(CommandMap.collection.name))) {
        const docs = Object.entries(commandMap).map(([command, settingKey]) => ({
            command,
            settingKey,
            module: settingKey,
            isSupergroupCommand: supergroupCommands.includes(command)
        }));
        await CommandMap.insertMany(docs);
        console.log(`✅ Imported ${CommandMap.collection.name}`);
    }
}
