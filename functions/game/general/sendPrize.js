import loadPlayer from "../../getters/loadPlayer.js";

/**
 * Начисляет золото игроку после завершения одиночной игры (кубики/баскетбол/
 * боулинг/дартс/футбол). Ставка хранится на самом игроке в member.game[gameName].bet.
 * @param {string} chatId - идентификатор чата
 * @param {string} userId - идентификатор игрока
 * @param {string} gameName - название игры
 * @param {number} modifier - множитель выигрыша
 * @returns {number} reward - сколько золота начислено
 */
export default async function(chatId, userId, gameName, modifier) {
    const { chat, member } = await loadPlayer(chatId, userId);
    if (!member) return 0;

    const bet = member.game?.[gameName]?.bet || 0;
    const reward = Math.round(bet * modifier);

    if (!member.game.inventory) {
        member.game.inventory = { gold: 0, crystals: 0, ironOre: 0 };
    }

    member.game.inventory.gold += reward;

    await chat.save();
    return reward;
}
