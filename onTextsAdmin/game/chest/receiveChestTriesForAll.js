import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import { myId } from '../../../config.js';
import getSession from '../../../functions/getters/getSession.js';
import restoreChestChances from '../../../functions/shedullers/restoreChestChances.js';

export default [[/(?:^|\s)\/receive_all_chest\b/, async (msg) => {
    if (msg.from.id !== myId) {
        return;
    }

    await getSession(msg.chat.id, msg.from.id);
    await deleteMessage(msg.chat.id, msg.message_id);
    await restoreChestChances();
    await sendMessage(myId, "Сундуки обновлены сброшены.");
}]];