const sword = require('./sword');
const chest = require('./chest');
const point = require('./point');
const gold = require('./gold');
const crystals = require('./crystals');
const experience = require('./experience');
const boss = require('./boss');
const dice = require('./dice');
const bowling = require('./bowling');
const darts = require('./darts');
const basketball = require('./basketball');
const football = require('./football');

module.exports = [
    ...sword,
    ...chest,
    ...point,
    ...gold,
    ...experience,
    ...dice,
    ...boss,
    ...crystals,
    ...bowling,
    ...darts,
    ...basketball,
    ...football
];