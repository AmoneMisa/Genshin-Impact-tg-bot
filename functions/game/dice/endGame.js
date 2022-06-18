module.exports = function (session) {
    return session.game.dice = {
        bet: 0,
        dice: 0,
        counter: 0,
        isStart: false
    };
};