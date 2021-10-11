const start = require('./start');
const getChatData = require('./getChatData');
const personalData = require('./personalData');
const titles = require('./titles');
const game = require('./game');

module.exports = [
    ...start,
    ...getChatData,
    ...personalData,
    ...titles,
    ...game
];