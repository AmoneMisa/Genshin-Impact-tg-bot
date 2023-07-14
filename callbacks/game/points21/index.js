const takeCard = require('./takeCard');
const bet = require('./bet');
const enter = require('./enter');
const leave = require('./leave');
const pass = require('./pass');

module.exports = [
    ...takeCard,
    ...bet,
    ...enter,
    ...leave,
    ...pass
];