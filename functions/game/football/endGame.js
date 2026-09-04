const initialFootballState = {
    bet: 0,
    ball: 0,
    counter: 0,
    isStart: false
};

/**
 * Сбрасывает состояние мини-игры "футбол" для игрока
 * @param {Object} member - объект участника (например, из Chat.members)
 * @returns {Object} новое состояние football
 */
export default function resetFootball(member) {
    if (!member.game) {
        member.game = {};
    }

    member.game.football = { ...initialFootballState };
    return member.game.football;
}
