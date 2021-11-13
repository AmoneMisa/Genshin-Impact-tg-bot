const sword = require('./sword');
const chest = require('./chest');
const point = require('./point');
const gold = require('./gold');
const experience = require('./experience');
const boss = require('./boss');

module.exports = [
    ...sword,
    ...chest,
    ...point,
    ...gold,
    ...experience,
    ...boss,
];