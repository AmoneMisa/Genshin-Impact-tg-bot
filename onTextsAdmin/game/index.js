const sword = require('./sword');
const chest = require('./chest');
const point = require('./point');
const gold = require('./gold');
const crystals = require('./crystals');
const experience = require('./experience');
const boss = require('./boss');
const dice = require('./dice');

module.exports = [
    ...sword,
    ...chest,
    ...point,
    ...gold,
    ...experience,
    ...dice,
    ...boss,
    ...crystals
];