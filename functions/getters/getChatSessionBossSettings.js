import Chat from "../../db/models/Chat.js";

export default async function(chatId) {
    const chat = await Chat.findOne({ chatId });

    if (!chat.bossSettings) {
        chat.bossSettings = {
            bossDealDamageMessage: 1,
            showHealMessage: 1
        };
        await chat.save();
    }

    return chat.bossSettings;
}
