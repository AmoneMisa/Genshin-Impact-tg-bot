const bot = require('../../../bot');
const sendMessage = require('../../../functions/sendMessage');
const getMembers = require('../../../functions/getMembers');
const buttonsDictionary = require('../../../dictionaries/buttons');
const debugMessage = require('../../../functions/debugMessage');

module.exports = [[/(?:^|\s)\/set_user_chest_timer\b/, (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        let members = getMembers(msg.chat.id);
        if (members[msg.from.id].userChatData.status !== "administrator" && members[msg.from.id].userChatData.status !== "creator") {
            return;
        }

        let buttons = [];
        let tempArray = null;
        let i = 0;

        for (let key of Object.keys(members)) {
            if (i % 3 === 0) {
                tempArray = [];
                buttons.push(tempArray);
            }
            tempArray.push({
                text: members[key].userChatData.user.first_name,
                callback_data: `set_chest_timer.${msg.chat.id}.${key}`
            });
            i++;
        }

        sendMessage(msg.from.id, "Выбери, кому ты хочешь обнулить таймер сундука", {
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
        debugMessage(`Command: /set_user_chest_timer\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];