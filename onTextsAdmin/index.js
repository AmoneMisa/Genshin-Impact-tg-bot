let game = require('./game');
let getChatData = require('./getChatData');
let addTrustedChat = require('./addTrustedChat');
let showAdminCommands = require('./showAdminCommands');

module.exports = [
    ...game,
    ...getChatData,
    ...addTrustedChat,
    ...showAdminCommands
];