import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getMembers from '../../../functions/getters/getMembers.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import swordsMessage from '../../../functions/game/sword/swordsMessage.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/swords\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let members = getMembers(msg.chat.id);

    await sendMessage(msg.chat.id, `${swordsMessage(members)}`, {
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