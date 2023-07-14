let game = require('./game');
let getChatData = require('./getChatData');
let getDebugLog = require('./getDebugLog');
let addTrustedChat = require('./addTrustedChat');
let showAdminCommands = require('./showAdminCommands');
let settings = require('./settings');

module.exports = [
    ...game,
    ...getChatData,
    ...getDebugLog,
    ...addTrustedChat,
    ...showAdminCommands,
    ...settings
];