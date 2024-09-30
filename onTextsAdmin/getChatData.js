import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import bot from '../bot.js';
import { myId } from '../config.js';
import deleteMessage from '../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/get_chat_data\b/, async (msg) => {
    if (msg.from.id !== myId) {
        return;
    }

    await deleteMessage(msg.chat.id, msg.message_id);
    await sendMessage(myId, `Данные из чата: ${msg.chat.id} - ${msg.chat.title};\n\nmsg: ${JSON.stringify(msg)}\n\n${JSON.stringify(await bot.getChat(msg.chat.id))}`);
}]];