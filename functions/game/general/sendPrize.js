module.exports = function (session, modifier) {
    session.game.inventory.gold += Math.round(session.game.dice.bet * modifier);
};