const summonBoss = require('./summonBoss');
const bossShowHp = require('./bossShowHp');
const shop = require('./shop');
const shopBuyItem = require('./shopBuyItem');
const exchange = require('./exchange');

module.exports = [
    ...summonBoss,
    ...bossShowHp,
    ...shop,
    ...shopBuyItem,
    ...exchange
];