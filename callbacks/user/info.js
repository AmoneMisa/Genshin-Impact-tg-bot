const buttonsDictionary = require('../../dictionaries/buttons');
const buildKeyboard = require('../../functions/buildKeyboard');
const controlButtons = require('../../functions/controlButtons');
const translation = require('../../dictionaries/translate');
const userTemplate = require('../../templates/userTemplate');
const getMembers = require('../../functions/getMembers');
const bot = require('../../bot');

module.exports = [["info", function (session, callback) {
    let buttons = buildKeyboard(callback.message.chat.id, 'info');

    return bot.editMessageText(`Выбери интересующего тебя участника`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons("info_", buttons, 1)
            ]
        }
    });
}], [/^info\.[^.]+$/, function (session, callback) {
    const [, userId] = callback.data.match(/^info\.([^.]+)$/);

    function formatMessage(item) {
        let str = "";

        if (item.userChatData.user.username) {
            str += `${item.userChatData.user.username}\n`;
        } else {
            str += `${item.userChatData.user.first_name}\n`;
        }

        for (let key of Object.keys(item.user)) {
            if (userTemplate.hasOwnProperty(key) && item.user[key] !== null && item.user[key] !== undefined) {
                str += `${translation[key]}: ${item.user[key]}\n`;
            }
        }

        str += "\n\n";

        if (!str.trim().length) {
            str += "Ещё нет никакой информации об этом пользователе. Он может заполнить её через бота командой /form"
        }
        return str;
    }

    let currentUser;
    let members = getMembers(callback.message.chat.id);

    for (let [key, value] of Object.entries(members)) {
        if (key === userId) {
            currentUser = value;
        }
    }

    bot.editMessageText(formatMessage(currentUser), {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "info"
            }, {
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}], [/^info_[^.]+$/, function (session, callback) {
    let [, page] = callback.data.match(/^info_([^.]+)$/);
    page = parseInt(page);

    let buttons = buildKeyboard(callback.message.chat.id, 'info');

    return bot.editMessageText(`Выбери интересующего тебя участника`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons("info", buttons, page)
            ]
        }
    });
}]];