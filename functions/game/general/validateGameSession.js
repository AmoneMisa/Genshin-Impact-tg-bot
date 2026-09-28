/**
 * Проверяет, может ли игрок продолжать участвовать в игре
 * @param {Object} game - объект игры
 * @param {string} userId - идентификатор игрока
 * @param {string} gameName - название игры
 * @returns {boolean}
 */
export default function canPlayerAct(game, userId, gameName) {
    if (!game?.players || !game.players[userId]) {
        return false;
    }

    const player = game.players[userId];

    // правила участия можно вынести в конфиг
    const rules = {
        elements: () => true,
        default: () => !player.isPass,
    };

    return (rules[gameName] || rules.default)();
}
