let game = require('./game');
let getChatData = require('./getChatData');
let getDebugLog = require('./getDebugLog');
let addTrustedChat = require('./addTrustedChat');
let showAdminCommands = require('./showAdminCommands');
let settings = require('./settings');
let sendFile = require('./sendFile');
let getFileAndBackup = require('./getFileAndBackup');

module.exports = [
    ...game,
    ...getChatData,
    ...getDebugLog,
    ...addTrustedChat,
    ...showAdminCommands,
    ...settings,
    ...sendFile,
    ...getFileAndBackup
];