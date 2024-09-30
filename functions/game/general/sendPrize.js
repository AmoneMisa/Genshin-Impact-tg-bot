export default function (session, modifier, gameName) {
    session.game.inventory.gold += Math.round(session.game[gameName].bet * modifier);
};