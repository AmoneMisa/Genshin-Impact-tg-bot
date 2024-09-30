import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import { myId } from '../../../config.js';
import clearSession from '../../../functions/misc/clearSession.js';
import {sessions} from '../../../data.js';

export default [[/(?:^|\s)\/clear_all_sessions\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            clearSession(session);
        }
    }
    await sendMessage(myId, "Все сессии очищены. Убедиться в результате можно по команде /get_file sessions.json");
}]];