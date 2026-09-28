/**
 * Проверяет, есть ли активная игровая сессия в чате
 * @param {Object} chatSession - объект сессии чата
 * @returns {boolean}
 */
export default function(chatSession) {
    if (!chatSession?.game) {
        return false;
    }

    return Object.values(chatSession.game).some(game => game.gameSessionIsStart);
}
