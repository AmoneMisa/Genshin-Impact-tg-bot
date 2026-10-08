import getChatData from './getChatData.js';
import sendFile from './sendFile.js';
import getFileAndBackup from './getFileAndBackup.js';
import updateUserFields from './updateUserFields.js';
import clearSessions from './game/player/clearSessionsInAllChatSessions.js';

// Owner tools that need Telegram file/reply flows or are one-off migrations.
// The rest of the owner tools live in the Mini App admin screen (miniapp/adminTools.js).
export default [
    ...getChatData,
    ...sendFile,
    ...getFileAndBackup,
    ...updateUserFields,
    ...clearSessions
];
