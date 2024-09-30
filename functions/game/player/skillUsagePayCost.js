export default function (session, costType, costCount) {
    session.game.gameClass.stats[costType] = Math.max(0, session.game.gameClass.stats[costType] - costCount);
};