const bot = require('../../bot');
const debugMessage = require('../../functions/debugMessage');
const sendMessage = require('../../functions/sendMessage');
const buttonsDictionary = require('../../dictionaries/buttons');
const getTime = require('../../functions/getTime');

function getOffset() {
    return new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
}

module.exports = [[/(?:^|\s)\/change_class\b/, (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        let [remain, hours, minutes, seconds] = getTime(session.timerSwordCallback);

        if (remain > 0) {
            if (hours > 0) {
                return `@${session.userChatData.user.username}, команду можно вызывать раз в неделю. Осталось: ${hours} ч ${minutes} мин ${seconds} сек`;
            } else if (minutes > 0) {
                return `@${session.userChatData.user.username}, команду можно вызывать раз в неделю. Осталось: ${minutes} мин ${seconds} сек`;
            } else {
                return `@${session.userChatData.user.username}, команду можно вызывать раз в неделю. Осталось: ${seconds} сек`;
            }
        }

        sendMessage(msg.chat.id, `@${session.userChatData.user.username}, выбери, свой класс.`, {
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: [[{
                    text: "Воин",
                    callback_data: "set_class.warrior"
                }, {
                    text: "Маг",
                    callback_data: "set_class.mage"
                }], [{
                    text: "Прист",
                    callback_data: "set_class.priest"
                }, {
                    text: "Лучник",
                    callback_data: "set_class.archer"
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });

        session.changeClassTimer = getOffset();
    } catch (e) {
        debugMessage(`Command: /change_class\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];