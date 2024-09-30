export default function (session) {
    return session.game.bowling = {
        bet: 0,
        skittles: 0,
        counter: 0,
        isStart: false
    };
};