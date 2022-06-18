const bets = require('./bets');
const pullDice = require('./pullDice');

module.exports = [
    ...bets,
    ...pullDice
];