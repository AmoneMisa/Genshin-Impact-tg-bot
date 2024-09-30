import dictionary from '../dictionaries/main.js';
import buttonsDictionary from '../dictionaries/buttons.js';
import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import deleteMessage from '../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/info/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    await sendMessage(msg.chat.id, `${dictionary["ru"].index}`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].info,
                callback_data: "info"
            }], [{
                text: buttonsDictionary["ru"].personal_info,
                callback_data: "personal_info"
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];