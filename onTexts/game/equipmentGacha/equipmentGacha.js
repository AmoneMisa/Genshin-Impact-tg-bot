import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import sendPhoto from '../../../functions/tgBotFunctions/sendPhoto.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import getFile from '../../../functions/getters/getFile.js';

export default [[/(?:^|\s)\/lucky_roll\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    let file = getFile(`images/gacha`, "choice");

    if (file) {
        await sendPhoto(msg.from.id, file, {
            caption: `@${getUserName(session, "nickname")}, выбери спираль удачи`,
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: [[{
                    text: "Спираль новичка",
                    callback_data: `lucky_roll.${msg.chat.id}.newbie`
                }, {
                    text: "Обычная спираль",
                    callback_data: `lucky_roll.${msg.chat.id}.common`
                }], [{
                    text: "Спираль редкостей",
                    callback_data: `lucky_roll.${msg.chat.id}.rare`
                }, {
                    text: "Королевская спираль",
                    callback_data: `lucky_roll.${msg.chat.id}.royal`
                }], [{
                    text: "Божественная спираль",
                    callback_data: `lucky_roll.${msg.chat.id}.goddess`
                }], [{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        });
    } else {
        return sendMessage(msg.from.id, `@${getUserName(session, "nickname")}, выбери спираль удачи`, {
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: [[{
                    text: "Спираль новичка",
                    callback_data: `lucky_roll.${msg.chat.id}.newbie`
                }, {
                    text: "Обычная спираль",
                    callback_data: `lucky_roll.${msg.chat.id}.common`
                }], [{
                    text: "Спираль редкостей",
                    callback_data: `lucky_roll.${msg.chat.id}.rare`
                }, {
                    text: "Королевская спираль",
                    callback_data: `lucky_roll.${msg.chat.id}.royal`
                }], [{
                    text: "Божественная спираль",
                    callback_data: `lucky_roll.${msg.chat.id}.goddess`
                }], [{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        })
    }
}]];