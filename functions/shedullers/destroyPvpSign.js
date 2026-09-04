import Chat from "../../db/models/Chat.js";

/**
 * Проверяет арену у всех игроков и очищает предметы с истёкшим сроком жизни
 */
export default async function() {
    const chats = await Chat.find({});

    for (const chat of chats) {
        let updated = false;

        for (const member of chat.members) {
            if (member.userChatData?.user?.is_bot) continue;

            const arenaItems = member.game?.inventory?.arena?.items;
            if (!arenaItems || !arenaItems[1]) continue;

            const item = arenaItems[1];
            if (Date.now() >= item.lifeTime) {
                arenaItems[1] = null;
                updated = true;
            }
        }

        if (updated) {
            await chat.save();
        }
    }
}
