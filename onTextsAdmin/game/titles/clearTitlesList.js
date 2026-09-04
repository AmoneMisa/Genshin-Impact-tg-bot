import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import Title from '../../../db/models/Title.js';
import { myId } from '../../../config.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';

export default [[/(?:^|\s)\/clear_titles/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    await Title.deleteMany({});

    await sendMessage(msg.from.id, "Титулы очищены", {
        disable_notification: true
    });
}]];