const bets = require('./bets');
const startGame = require('./startGame');

module.exports = [
    ...bets,
    ...startGame
];