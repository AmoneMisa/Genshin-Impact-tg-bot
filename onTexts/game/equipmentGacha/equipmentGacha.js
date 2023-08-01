const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const sendPhoto = require('../../../functions/tgBotFunctions/sendPhoto');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const getFile = require("../../../functions/getters/getFile");

module.exports = [[/(?:^|\s)\/lucky_roll\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    let file = getFile(`images/gacha`, "choice");

    if (file) {
        await sendPhoto(msg.chat.id, file, {
            caption: `@${getUserName(session, "nickname")}, выбери спираль удачи`,
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: [[{
                    text: "Спираль новичка",
                    callback_data: "lucky_roll.newbie"
                }, {
                    text: "Обычная спираль",
                    callback_data: "lucky_roll.common"
                }], [{
                    text: "Спираль редкостей",
                    callback_data: "lucky_roll.rare"
                }, {
                    text: "Королевская спираль",
                    callback_data: "lucky_roll.royal"
                }], [{
                    text: "Божественная спираль",
                    callback_data: "lucky_roll.goddess"
                }], [{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        });
    } else {
        return sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, выбери спираль удачи`, {
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: [[{
                    text: "Спираль новичка",
                    callback_data: "lucky_roll.newbie"
                }, {
                    text: "Обычная спираль",
                    callback_data: "lucky_roll.common"
                }], [{
                    text: "Спираль редкостей",
                    callback_data: "lucky_roll.rare"
                }, {
                    text: "Королевская спираль",
                    callback_data: "lucky_roll.royal"
                }], [{
                    text: "Божественная спираль",
                    callback_data: "lucky_roll.goddess"
                }], [{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        })
    }
}]];