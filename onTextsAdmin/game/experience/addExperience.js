const bot = require('../../../bot');
const sendMessage = require('../../../functions/sendMessage');
const getMembers = require('../../../functions/getMembers');
const buttonsDictionary = require('../../../dictionaries/buttons');
const debugMessage = require('../../../functions/debugMessage');

module.exports = [[/(?:^|\s)\/add_experience\b/, (msg) => {
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
                callback_data: `add_experience.${msg.chat.id}.${key}`
            });
            i++;
        }

        sendMessage(msg.from.id, "Выбери, кому ты хочешь добавить опыта", {
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
        debugMessage(`Command: /add_experience\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];