const summonBoss = require('./summonBoss');
const userDealDamage = require('./userDealDamage');
const userStatsList = require('./userStatsList');
const bossShowHp = require('./bossShowHp');
const shop = require('./shop');
const shopBuyItem = require('./shopBuyItem');
const userHeal = require('./userHeal');
const potion = require('./potion');

module.exports = [
    ...summonBoss,
    ...userDealDamage,
    ...userStatsList,
    ...bossShowHp,
    ...shop,
    ...shopBuyItem,
    ...userHeal,
    ...potion
];