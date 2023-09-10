const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const getFile = require("../../../functions/getters/getFile");
const sendPhoto = require("../../../functions/tgBotFunctions/sendPhoto");

module.exports = [[/(?:^|\s)\/arena_leaderboard\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    const file = getFile("images/misc", "commonArena");

    if (file) {
        await sendPhoto(msg.from.id, file, {
            caption: `Какой тип арены тебя интересует?`,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        });
    } else {
        await sendMessage(msg.from.id, `Какой тип арены тебя интересует?`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        });
    }
}], [/(?:^|\s)\/arena_expansion_leaderboard\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    const file = getFile("images/misc", "expansionArena");

    if (file) {
        await sendPhoto(msg.from.id, file, {
            caption: `Какой тип арены тебя интересует?`,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        });
    }  else {
        await sendMessage(msg.from.id, `Какой тип арены тебя интересует?`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        });
    }
}]];