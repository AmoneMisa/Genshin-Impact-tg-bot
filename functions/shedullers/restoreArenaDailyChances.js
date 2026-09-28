import Chat from "../../db/models/Chat.js";

/**
 * Сбрасывает шансы игроков на арену до максимальных значений
 */
export default async function() {
    const chats = await Chat.find({});

    for (const chat of chats) {
        let updated = false;

        for (const member of chat.members) {
            if (member.userChatData?.user?.is_bot) continue;

            const game = member.game;
            if (!game) continue;

            game.arenaChances = 15;
            game.arenaExpansionChances = 10;

            updated = true;
        }

        if (updated) {
            await chat.save();
        }
    }
}
