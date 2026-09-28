import Chat from "../../db/models/Chat.js";

/**
 * Сбрасывает шанс кражи у всех игроков до 2
 */
export default async function() {
    const chats = await Chat.find({});

    for (const chat of chats) {
        let updated = false;

        for (const member of chat.members) {
            if (member.userChatData?.user?.is_bot) continue;

            const game = member.game;
            if (!game) continue;

            game.chanceToSteal = 2;
            updated = true;
        }

        if (updated) {
            await chat.save();
        }
    }
}
