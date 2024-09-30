import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import swordResult from '../../../functions/game/sword/swordResult.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/sword\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    await sendMessage(msg.chat.id, `${swordResult(session)}`, {
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