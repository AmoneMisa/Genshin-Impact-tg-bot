const info = require('./info');
const start = require('./start');
const help = require('./help');
const personalData = require('./personalData');
const titles = require('./titles');
const game = require('./game');

module.exports = [
    ...start,
    ...info,
    ...help,
    ...personalData,
    ...titles,
    ...game
];