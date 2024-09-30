export default function (session) {
    if (!session.hasOwnProperty("game")) {
        session.game = {};
    }

    session.game.dice = {
        bet: 0,
        dice: 0,
        counter: 0,
        isStart: false
    };
};