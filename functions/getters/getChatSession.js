import Chat from "../../db/models/Chat.js";

export default async function(chatId) {
    let chat = await Chat.findOne({ chatId });

    if (!chat) {
        chat = await Chat.create({
            chatId,
            game: { points: {}, elements: {} },
            bossSettings: { showDamageMessage: 1, showHealMessage: 1 },
            members: []
        });
    }

    return chat;
}
