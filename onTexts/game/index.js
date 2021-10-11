const sendGold = require('./sendGold');
const boss = require('./boss');
const sword = require('./sword');
const chest = require('./chest');

module.exports = [
    ...sendGold,
    ...sword,
    ...boss,
    ...chest
];