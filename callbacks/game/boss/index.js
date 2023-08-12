const sendGoldCallback = require('./sendGoldCallback');
const boss = require('./boss');
const bossSettings = require('./bossSettings');

module.exports = [
    ...sendGoldCallback,
    ...boss,
    ...bossSettings
];