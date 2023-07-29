const sword = require('./sword');
const chest = require('./chest');
const point = require('./point');
const gold = require('./gold');
const ironOre = require('./ironOre');
const crystals = require('./crystals');
const experience = require('./experience');
const boss = require('./boss');
const dice = require('./dice');
const bowling = require('./bowling');
const darts = require('./darts');
const basketball = require('./basketball');
const football = require('./football');
const elements = require('./elements');
const player = require('./player');

module.exports = [
    ...sword,
    ...chest,
    ...point,
    ...gold,
    ...ironOre,
    ...experience,
    ...dice,
    ...boss,
    ...crystals,
    ...bowling,
    ...darts,
    ...basketball,
    ...football,
    ...elements,
    ...player
];