import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import { myId } from '../../../config.js';
import updatePlayerStats from '../../../functions/game/player/updatePlayerStats.js';
import {sessions} from '../../../data.js';
import setLevel from '../../../functions/game/player/setLevel.js';

export default [[/(?:^|\s)\/update_all_players_characteristic\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            updatePlayerStats(session);
            setLevel(session);
        }
    }
    await sendMessage(myId, "Все сессии обновлены. Убедиться в результате можно по команде /get_file sessions.json");
}]];