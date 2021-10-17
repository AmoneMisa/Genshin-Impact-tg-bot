let game = require('./game');
let getChatData = require('./getChatData');

module.exports = [
    ...game,
    ...getChatData
];