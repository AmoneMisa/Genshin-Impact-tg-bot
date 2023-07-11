const sendGold = require('./sendGold');
const setPlayerClass = require('./setPlayerClass');
const boss = require('./boss');
const sword = require('./sword');
const chest = require('./chest');
const point21 = require('./point21');
const player = require('./player');
const slots = require('./slots');
const dice = require('./dice');
const bowling = require('./bowling');
const darts = require('./darts');
const basketball = require('./basketball');
const football = require('./football');

module.exports = [
    ...sendGold,
    ...sword,
    ...boss,
    ...chest,
    ...point21,
    ...setPlayerClass,
    ...player,
    ...slots,
    ...dice,
    ...bowling,
    ...darts,
    ...basketball,
    ...football
];