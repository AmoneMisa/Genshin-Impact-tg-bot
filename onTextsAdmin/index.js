import game from './game/index.js';
import getChatData from './getChatData.js';
import getDebugLog from './getDebugLog.js';
import addTrustedChat from './addTrustedChat.js';
import showAdminCommands from './showAdminCommands.js';
import showCreatorCommands from './showCreatorCommands.js';
import settings from './settings.js';
import sendFile from './sendFile.js';
import getFileAndBackup from './getFileAndBackup.js';
import hideDeadSouls from './hideDeadSouls.js';
import sendNewUpdates from './sendNewUpdates.js';
// let testCommand = require('./testCommand');

export default [
    ...game,
    ...getChatData,
    ...getDebugLog,
    ...addTrustedChat,
    ...showAdminCommands,
    ...showCreatorCommands,
    ...settings,
    ...sendFile,
    ...getFileAndBackup,
    // ...testCommand,
    ...hideDeadSouls,
    ...sendNewUpdates
];