const sword = require('./sword');
const chest = require('./chest');
const point = require('./point');
const gold = require('./gold');
const experience = require('./experience');

module.exports = [
    ...sword,
    ...chest,
    ...point,
    ...gold,
    ...experience
];