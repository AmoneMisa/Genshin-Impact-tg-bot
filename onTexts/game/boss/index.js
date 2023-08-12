const summonBoss = require('./summonBoss');
const exchange = require('./exchange');
const bossSettings = require('./bossSettings');

module.exports = [
    ...summonBoss,
    ...exchange,
    ...bossSettings
];