import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import getRandom from '../../../functions/getters/getRandom.js';
import horoscopes from '../../../dictionaries/horoscopes.js';

export default [[/(?:^|\s)\/horoscope\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let start = horoscopes.start[getRandom(0, horoscopes.start.length - 1)];
    let action = horoscopes.action[getRandom(0, horoscopes.action.length - 1)];
    let end = horoscopes.end[getRandom(0, horoscopes.end.length - 1)];


    return sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, твоё шуточное предсказание: ${start} ${action} ${end}`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [[{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    })
}]];