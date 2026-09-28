import Chat from "../../db/models/Chat.js";

export default async function(chatId) {
    const chat = await Chat.findOne({ chatId });

    if (!chat) {
        return [];
    }

    return chat.members || [];
}
