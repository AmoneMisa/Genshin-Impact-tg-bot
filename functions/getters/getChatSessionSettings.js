import ChatSettings from "../../db/models/ChatSettings.js";

export default async function(chatId) {
    let settings = await ChatSettings.findOne({ chatId });

    const settingsTemplate = {
        dice: 1, chests: 1, boss: 1, form: 1, sendGold: 1, points: 1, elements: 1,
        bowling: 1, football: 1, basketball: 1, darts: 1, slots: 1, swords: 1,
        titles: 1, whoami: 1, mute: 1, horoscope: 1, bonus: 1
    };

    if (!settings) {
        settings = await ChatSettings.create({ chatId, settings: settingsTemplate });
    }

    return { ...settingsTemplate, ...settings.settings };
}
