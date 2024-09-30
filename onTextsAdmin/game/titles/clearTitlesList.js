import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import {titles} from '../../../data.js';
import { myId } from '../../../config.js';
import lodash from 'lodash';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';

export default [[/(?:^|\s)\/clear_titles/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    for (let titleList of Object.values(titles)) {
        lodash.remove(titleList, lodash.isObject);
    }

    await sendMessage(msg.from.id, "Титулы очищены", {
        disable_notification: true
    });
}]];