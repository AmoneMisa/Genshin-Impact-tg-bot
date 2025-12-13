import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import getUserName from '../../../functions/getters/getUserName.js';
import getRandom from '../../../functions/getters/getRandom.js';
import getMembers from '../../../functions/getters/getMembers.js';
import getTime from '../../../functions/getters/getTime.js';
import getStringRemainTime from '../../../functions/getters/getStringRemainTime.js';
import Title from "../../../db/models/Title.js";

export default [[/(?:^|\s)\/title ([А-Яа-яЁёA-Za-z]+)(?:\s|$)/, async (msg, session, [, title]) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (!title) {
        return sendMessageWithDelete(msg.chat.id,
            "Чтобы присвоить титул случайному участнику группы, используйте команду: '/title текст'. Команда принимает одно слово и устанавливает его в качестве титула.",
            {
                ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
                disable_notification: true
            },
            30 * 1000
        );
    }

    let message;
    let members = await getMembers(msg.chat.id);
    let filteredMembers = Object.values(members).filter(member => !member.userChatData.user.is_bot && !member.isHided);
    let randomMember = filteredMembers[getRandom(0, filteredMembers.length - 1)];

    if (!session.timerTitleCallback || Date.now() >= session.timerTitleCallback) {
        session.timerTitleCallback = Date.now() + 10 * 60 * 1000;
        message = `Сегодня ты, @${await getUserName(randomMember, "nickname")} - ${title}`;

        await Title.create({
            chatId: msg.chat.id.toString(),
            userId: randomMember.userChatData.user.id.toString(),
            nickname: getUserName(randomMember, "nickname"),
            titleName: title
        });

        const titles = await Title.find({ chatId: msg.chat.id.toString() })
            .sort({ obtainedAt: -1 })
            .skip(15);
        for (const oldTitle of titles) {
            await Title.deleteOne({ _id: oldTitle._id });
        }

    } else {
        let [remain] = getTime(session.timerTitleCallback);
        message = `@${await getUserName(session, "nickname")}, команду можно вызывать раз в 10 минут. Осталось: ${getStringRemainTime(remain)}`;
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
