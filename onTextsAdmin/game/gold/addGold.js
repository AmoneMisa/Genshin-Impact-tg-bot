const bot = require('../../../bot');
const {myId, friendId} = require('../../../config');
const sendMessage = require('../../../functions/sendMessage');
const getMembers = require('../../../functions/getMembers');
const buttonsDictionary = require('../../../dictionaries/buttons');
const debugMessage = require('../../../functions/debugMessage');

module.exports = [[/(?:^|\s)\/add_gold\b/, (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        if (msg.from.id !== myId && msg.from.id !== friendId) {
            return;
        }

        let members = getMembers(msg.chat.id);

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
                callback_data: `add_gold.${msg.chat.id}.${key}`
            });
            i++;
        }

        sendMessage(msg.from.id, "Выбери, кому ты хочешь добавить золота", {
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
        debugMessage(`Command: /add_gold\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];