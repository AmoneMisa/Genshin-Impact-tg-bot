const bets = require('./bets');
const pullBall = require('./pullBall');

module.exports = [
    ...bets,
    ...pullBall
];