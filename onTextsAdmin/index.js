let game = require('./game');
let getChatData = require('./getChatData');
let addTrustedChat = require('./addTrustedChat');

module.exports = [
    ...game,
    ...getChatData,
    ...addTrustedChat
];