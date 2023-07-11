module.exports = function (session) {
    return session.game.darts = {
        bet: 0,
        dart: 0,
        counter: 0,
        isStart: false
    };
};