const bet = require('./bet');
const pass = require('./pass');
const takeCard = require('./takeCard');
const enter = require('./enter');
const leave = require('./leave');

module.exports = [
    ...bet,
    ...pass,
    ...takeCard,
    ...enter,
    ...leave
];