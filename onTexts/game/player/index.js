const userDealDamage = require('./userDealDamage');
const whoami = require('./whoami');

module.exports = [
    ...userDealDamage,
    ...whoami
];