const bot = require('../../../bot');
const {myId} = require('../../../config');
const {sessions} = require('../../../data');
const sendMessage = require('../../../functions/sendMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');

module.exports = [[/(?:^|\s)\/set_user_sword_timer\b/, (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        if (msg.from.id !== myId && msg.from.id !== 247412171) {
            return;
        }

        let chatSession = sessions[msg.chat.id];

        let buttons = [];
        let tempArray = null;
        let i = 0;

        for (let key of Object.keys(chatSession)) {
            if (i % 3 === 0) {
                tempArray = [];
                buttons.push(tempArray);
            }
            tempArray.push({
                text: chatSession[key].userChatData.user.first_name,
                callback_data: `set_timer.${msg.chat.id}.${key}`
            });
            i++;
        }

        sendMessage(msg.from.id, "Выбери, кому ты хочешь обнулить таймер", {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [
                    ...buttons, [{
                        text: buttonsDictionary["ru"].close,
                        callback_data: "close"
                    }]]
            }
        });
    } catch (e) {
        sendMessage(myId, `Command: /set_user_sword_timer\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];