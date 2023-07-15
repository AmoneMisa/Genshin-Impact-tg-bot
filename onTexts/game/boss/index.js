const summonBoss = require('./summonBoss');
const bossShowHp = require('./bossShowHp');
const exchange = require('./exchange');

module.exports = [
    ...summonBoss,
    ...bossShowHp,
    ...exchange
];