import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import { myId } from '../../../config.js';
import {bosses, sessions} from '../../../data.js';

export default [[/(?:^|\s)\/clear_boss_sessions\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    for (let [chatId, chatSession] of Object.entries(sessions)) {
        if (Object.values(chatSession.members).length !== 1) {
            continue;
        }

        if (chatId !== Object.keys(chatSession.members)[0]) {
            continue;
        }

        delete bosses[chatId];
        delete chatSession.boss;
    }

    for (let bossChatId of Object.keys(bosses)) {
        if (sessions[bossChatId]) {
            continue;
        }

        delete bosses[bossChatId];
    }

    await sendMessage(myId, "Все чат сессии очищены. Убедиться в результате можно по команде /get_file bosses.json");
}]];