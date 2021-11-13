const userDealDamage = require('./userDealDamage');
const userStatsList = require('./userStatsList');
const userHeal = require('./userHeal');
const potion = require('./potion');

module.exports = [
    ...userDealDamage,
    ...userStatsList,
    ...userHeal,
    ...potion
];