const userCallbacks = require('./user');
const closeCallback = require('./close');
const bossCallback = require('./game/boss');
const chestCallback = require('./game/chest');
const swordCallback = require('./game/sword');
const points21 = require('./game/point21');

module.exports = [
    ...userCallbacks,
    ...closeCallback,
    ...bossCallback,
    ...chestCallback,
    ...swordCallback,
    ...points21
];