import { titles } from '../../../data.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import titlesMessage from '../../../functions/game/titles/titlesMessage.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/titles/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    await sendMessage(msg.chat.id, titlesMessage(titles[msg.chat.id]), {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];