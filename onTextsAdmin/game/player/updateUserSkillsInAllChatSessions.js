import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import { myId } from '../../../config.js';
import updatePlayerSkills from '../../../functions/game/player/updatePlayerSkills.js';
import {sessions} from '../../../data.js';

export default [[/(?:^|\s)\/update_all_players_skills\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            updatePlayerSkills(session);
        }
    }
    return sendMessage(myId, "Все скиллы сессий обновлены. Убедиться в результате можно по команде /get_file sessions.json");
}]];