import dictionary from '../../dictionaries/main.js';
import sendMessage from '../../functions/tgBotFunctions/sendMessage.js';
import deleteMessageTimeout from '../../functions/tgBotFunctions/deleteMessageTimeout.js';
import setButtons from '../../functions/form/setButtons.js';
import commands from '../../dictionaries/commands.js';
import getUserName from '../../functions/getters/getUserName.js';
import deleteMessage from '../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/form/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let buttons = setButtons(commands);

    let name = getUserName(session, "nickname") !== undefined ? getUserName(session, "nickname") : getUserName(session, "name");

    sendMessage(msg.chat.id, `@${name}, ${dictionary["ru"].index}`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: JSON.stringify({
            selective: true,
            keyboard: buttons,
            one_time_keyboard: true
        })
    }).then(message => {
        session.keyboardMessage = message;
        deleteMessageTimeout(msg.chat.id, message.message_id, 10000);
    })
}]];