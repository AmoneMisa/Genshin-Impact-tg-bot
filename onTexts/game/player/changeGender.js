import sendPhoto from '../../../functions/tgBotFunctions/sendPhoto.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import getUserName from '../../../functions/getters/getUserName.js';
import getFile from '../../../functions/getters/getFile.js';

export default [[/(?:^|\s)\/select_gender\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    const file = getFile("images/misc", "gender");

    await sendPhoto(msg.chat.id, file, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        caption: `@${getUserName(session, "nickname")}, выбери свой пол`,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Мужской",
                callback_data: `gender.male`
            }], [{
                text: "Женский",
                callback_data: `gender.female`
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];