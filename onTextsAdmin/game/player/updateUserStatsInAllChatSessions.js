import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import { myId } from '../../../config.js';
import updatePlayerStats from '../../../functions/game/player/updatePlayerStats.js';
import Chat from '../../../db/models/Chat.js';
import setLevel from '../../../functions/game/player/setLevel.js';

export default [[/(?:^|\s)\/update_all_players_characteristic\b/, async (msg) => {
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

            updatePlayerStats(session);
            setLevel(session);
        }
        await chat.save();
    }
    await sendMessage(myId, "Все сессии обновлены.");
}]];