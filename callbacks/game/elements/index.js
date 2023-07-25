const bet = require('./bet');
const takeElement = require('./takeElement');
const enter = require('./enter');
const leave = require('./leave');

module.exports = [
    ...bet,
    ...takeElement,
    ...enter,
    ...leave
]