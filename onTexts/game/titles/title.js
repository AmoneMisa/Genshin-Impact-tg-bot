import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import getUserName from '../../../functions/getters/getUserName.js';
import getRandom from '../../../functions/getters/getRandom.js';
import getMembers from '../../../functions/getters/getMembers.js';
import getTime from '../../../functions/getters/getTime.js';
import getStringRemainTime from '../../../functions/getters/getStringRemainTime.js';
import {titles} from '../../../data.js';

export default [[/(?:^|\s)\/title ([A-яА-яЁё]+)(?:\s|$)/, async (msg, session, [, title]) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (!title) {
        return sendMessageWithDelete(msg.chat.id, "Чтобы присвоить титул случайному участнику группы, необходимо использовать команду в виде: '/title текст' - команда принимает одно слово после ввода и устанавливает его в качестве титула", {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
            disable_notification: true
        }, 30 * 1000);
    }

    let message;
    let members = getMembers(msg.chat.id);
    let filteredMembers = Object.values(members).filter(member => !member.userChatData.user.is_bot && !member.isHided);
    let randomMember = filteredMembers[getRandom(0, filteredMembers.length - 1)];

    if (!session.timerTitleCallback || new Date().getTime() >= session.timerTitleCallback) {
        session.timerTitleCallback = new Date().getTime() + 10 * 60 * 1000;
        message = `Сегодня ты, @${getUserName(randomMember, "nickname")} - ${title}`;

        if (!titles[msg.chat.id]) {
            titles[msg.chat.id] = [];
        }

        titles[msg.chat.id].unshift(message.replace("@", ""));

        while (titles[msg.chat.id].length > 15) {
            titles[msg.chat.id].pop();
        }

    } else {
        let [remain] = getTime(session.timerTitleCallback);
        message = `@${getUserName(session, "nickname")}, команду можно вызывать раз в 10 минут. Осталось: ${getStringRemainTime(remain)}`;
    }

    await sendMessageWithDelete(msg.chat.id, message, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, 60 * 1000);
}]];