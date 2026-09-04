import Chat from "../../../db/models/Chat.js";
import getChatSession from "../../getters/getChatSession.js";
import getSession from "../../getters/getSession.js";

/**
 * Начисляет золото игроку после завершения игры
 * @param {string} chatId - идентификатор чата
 * @param {string} userId - идентификатор игрока
 * @param {string} gameName - название игры
 * @param {number} modifier - множитель выигрыша
 * @returns {number} amount - сколько золота начислено
 */
export default async function(chatId, userId, gameName, modifier) {
    const chat = await getChatSession(chatId);
    if (!chat || !chat.game[gameName]) return 0;

    const player = chat.game[gameName].players[userId];
    if (!player) return 0;

    const member = await getSession(chatId, userId);
    if (!member) return 0;

    const bet = player.bet || 0;
    const reward = Math.round(bet * modifier);

    if (!member.game.inventory) {
        member.game.inventory = { gold: 0, crystals: 0, ironOre: 0 };
    }

    member.game.inventory.gold += reward;

    await chat.save();
    return reward;
}
