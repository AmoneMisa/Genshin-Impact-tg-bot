import dictionary from '../../dictionaries/main.js';
import sendMessage from '../../functions/tgBotFunctions/sendMessage.js';
import deleteMessageTimeout from '../../functions/tgBotFunctions/deleteMessageTimeout.js';
import setButtons from '../../functions/form/setButtons.js';
import commands from '../../dictionaries/commands.js';
import getUserName from '../../functions/getters/getUserName.js';
import deleteMessage from '../../functions/tgBotFunctions/deleteMessage.js';
import loadPlayer from '../../functions/getters/loadPlayer.js';

export default [[/(?:^|\s)\/form/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let buttons = setButtons(commands);

    let name = getUserName(session, "nickname") !== undefined ? getUserName(session, "nickname") : getUserName(session, "name");

    const message = await sendMessage(msg.chat.id, `@${name}, ${dictionary["ru"].index}`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: JSON.stringify({
            selective: true,
            keyboard: buttons,
            one_time_keyboard: true
        })
    });

    const { chat, member } = await loadPlayer(msg.chat.id, session.userId);
    if (member) {
        member.keyboardMessage = message;
        await chat.save();
    }

    deleteMessageTimeout(msg.chat.id, message.message_id, 10000);
}]];