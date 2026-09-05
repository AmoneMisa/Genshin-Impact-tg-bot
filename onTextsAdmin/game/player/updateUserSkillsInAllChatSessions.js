import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import { myId } from '../../../config.js';
import updatePlayerSkills from '../../../functions/game/player/updatePlayerSkills.js';
import Chat from '../../../db/models/Chat.js';

export default [[/(?:^|\s)\/update_all_players_skills\b/, async (msg) => {
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

            updatePlayerSkills(session);
        }
        await chat.save();
    }
    return sendMessage(myId, "Все скиллы сессий обновлены.");
}]];