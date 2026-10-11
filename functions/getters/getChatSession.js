import Chat from "../../db/models/Chat.js";

export default async function(chatId, {create = true} = {}) {
    let chat = await Chat.findOne({ chatId });

    if (!chat) {
        const initial = {
            chatId,
            game: { points: {}, elements: {} },
            bossSettings: { showDamageMessage: 1, showHealMessage: 1 },
            members: []
        };
        chat = create ? await new Chat(initial).save() : new Chat(initial);
    }

    return chat;
}
