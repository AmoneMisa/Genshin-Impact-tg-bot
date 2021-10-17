const buttonsDictionary = require('../../dictionaries/buttons');
const sendMessage = require('../../functions/sendMessage');
const translation = require('../../dictionaries/translate');
const userTemplate = require('../../templates/userTemplate');
const getMembers = require('../../functions/getMembers');
const debugMessage = require('../../functions/debugMessage');

module.exports = [["info", function (session, callback) {
    function buttonsTemplate() {
        let buttons = [];
        let tempArray = null;
        let i = 0;
        let members = getMembers(callback.message.chat.id);
        debugMessage(callback.message.chat.id);
        debugMessage(members);

        for (let key of Object.keys(members)) {
            let member = members[key];
            if (i % 3 === 0) {
                tempArray = [];
                buttons.push(tempArray);
            }
            tempArray.push({text: member.userChatData.user.first_name, callback_data: `info.${key}`});
            i++;
        }

        return buttons;
    }

    let buttons = buttonsTemplate();

    return sendMessage(callback.message.chat.id, `Выбери интересующего тебя участника`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...buttons, [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]
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
            str += "Ещё нет никакой информации об этом пользователе. Он может заполнить её через бота командой /menu"
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

    sendMessage(callback.message.chat.id, formatMessage(currentUser), {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];