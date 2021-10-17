const bet = require('./bet');
const pass = require('./pass');
const takeCard = require('./takeCard');

module.exports = [
    ...bet,
    ...pass,
    ...takeCard
];