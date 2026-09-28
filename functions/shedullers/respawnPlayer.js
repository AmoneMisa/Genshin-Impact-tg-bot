import Chat from "../../db/models/Chat.js";
import getMaxHp from "../game/player/getters/getMaxHp.js";

/**
 * Проверяет всех игроков и респаунит их, если время прошло и HP = 0
 */
export default async function() {
    const chats = await Chat.find({});

    for (const chat of chats) {
        let updated = false;

        for (const member of chat.members) {
            if (member.userChatData?.user?.is_bot) continue;

            const game = member.game;
            if (!game) continue;

            // Если время респауна ещё не прошло
            if (Date.now() < game.respawnTime) continue;

            // Если игрок живой (hp != 0)
            if (game.gameClass?.stats?.hp !== 0) continue;

            // Восстанавливаем половину максимального HP
            const maxHp = getMaxHp(member, game.gameClass);
            game.gameClass.stats.hp = Math.floor(maxHp * 0.5);

            updated = true;
        }

        if (updated) {
            await chat.save();
        }
    }
}
