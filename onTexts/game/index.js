const sendGold = require('./sendGold');
const boss = require('./boss');
const sword = require('./sword');
const chest = require('./chest');
const point21 = require('./point21');

module.exports = [
    ...sendGold,
    ...sword,
    ...boss,
    ...chest,
    ...point21
];