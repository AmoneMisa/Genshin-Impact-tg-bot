import Chat from "../../db/models/Chat.js";

/**
 * Сбрасывает количество попыток открытия сундука у всех игроков до 1
 */
export default async function() {
    const chats = await Chat.find({});

    for (const chat of chats) {
        let updated = false;

        for (const member of chat.members) {
            if (member.userChatData?.user?.is_bot) continue;

            const game = member.game;
            if (!game) continue;

            member.chestTries = 1;
            updated = true;
        }

        if (updated) {
            await chat.save();
        }
    }
}
