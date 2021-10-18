const bot = require('../../bot');
const debugMessage = require('../../functions/debugMessage');
const sendMessage = require('../../functions/sendMessage');
const buttonsDictionary = require('../../dictionaries/buttons');
const getMembers = require('../../functions/getMembers');

module.exports = [[/(?:^|\s)\/send_gold\b/, (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let usersList = getMembers(msg.chat.id);

        usersList = Object.values(usersList).filter(item => !item.userChatData.user.is_bot && (item.userChatData.user.id !== msg.from.id));

        if (!usersList.length) {
            sendMessage(msg.chat.id, `Нет никого, кому ты мог бы перевести золото.`, {
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [[{
                        text: buttonsDictionary["ru"].close,
                        callback_data: "close"
                    }]]
                }
            });

            return;
        }

        function buildButtons() {
            let buttons = [];
            let tempArray = [];
            let button = {};
            let i = 0;
            for (let _user of Object.values(usersList)) {

                if (i % 3 === 0) {
                    tempArray = [];
                    buttons.push(tempArray);
                }
                button.text = `${_user.userChatData.user.first_name}`;
                button.callback_data = `send_gold_recipient.${_user.userChatData.user.id}`;

                tempArray.push(button);
                button = {};
                i++;
            }

            return buttons;
        }

        sendMessage(msg.chat.id, `@${session.userChatData.user.username}, выбери, кому хочешь перевести золото.`, {
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: [
                    ...buildButtons(), [{
                        text: buttonsDictionary["ru"].close,
                        callback_data: "close"
                    }]]
            }
        })
    } catch (e) {
        debugMessage(`Command: /send_gold\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];