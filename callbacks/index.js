const userCallbacks = require('./user');
const closeCallback = require('./close');
const bossCallback = require('./boss');
const chestCallback = require('./chest');
const swordCallback = require('./sword');
const points21 = require('./point21');

module.exports = [
    ...userCallbacks,
    ...closeCallback,
    ...bossCallback,
    ...chestCallback,
    ...swordCallback,
    ...points21
];