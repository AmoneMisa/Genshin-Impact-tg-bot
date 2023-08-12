const sendGold = require('./sendGold');
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
const elements = require('./elements');
const shop = require('./shop');
const equipmentGacha = require('./equipmentGacha');
const horoscopes = require('./horoscopes');

module.exports = [
    ...sendGold,
    ...sword,
    ...boss,
    ...chest,
    ...point21,
    ...player,
    ...slots,
    ...dice,
    ...bowling,
    ...darts,
    ...basketball,
    ...football,
    ...elements,
    ...equipmentGacha,
    ...shop,
    ...horoscopes
];