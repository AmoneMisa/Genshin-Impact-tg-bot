import Chat from "../../db/models/Chat.js";
import gachaTemplate from "../../template/gachaTemplate.js";

/**
 * Сбрасывает бесплатные спины в гача-системе для всех игроков
 */
export default async function resetGachaSpins() {
    const chats = await Chat.find({});

    for (const chat of chats) {
        let updated = false;

        for (const member of chat.members) {
            if (member.userChatData?.user?.is_bot) continue;

            const game = member.game;
            if (!game) continue;

            if (!game.gacha) {
                game.gacha = {};
            }

            for (const value of gachaTemplate) {
                game.gacha[value.name] = value.freeSpins;
            }

            updated = true;
        }

        if (updated) {
            await chat.save();
        }
    }
}
