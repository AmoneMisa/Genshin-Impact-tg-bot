import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import { myId } from '../../../config.js';
import clearSession from '../../../functions/misc/clearSession.js';
import Chat from '../../../db/models/Chat.js';

export default [[/(?:^|\s)\/clear_all_sessions\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    const chats = await Chat.find({});
    for (let chat of chats) {
        for (let session of chat.members) {
            if (session.userChatData?.user?.is_bot) {
                continue;
            }

            clearSession(session);
        }
        await chat.save();
    }
    await sendMessage(myId, "Все сессии очищены.");
}]];