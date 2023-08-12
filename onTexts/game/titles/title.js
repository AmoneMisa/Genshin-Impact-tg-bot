const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const buttonsDictionary = require('../../../dictionaries/buttons');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const getUserName = require("../../../functions/getters/getUserName");
const getRandom = require("../../../functions/getters/getRandom");
const getMembers = require("../../../functions/getters/getMembers");
const getTime = require("../../../functions/getters/getTime");
const getStringRemainTime = require("../../../functions/getters/getStringRemainTime");
const data = require("../../../data");

module.exports = [[/(?:^|\s)\/title ([A-яА-яЁё]+)(?:\s|$)/, async (msg, session, [, title]) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let message;
    let members = getMembers(msg.chat.id);
    let filteredMembers = Object.values(members).filter(member => !member.userChatData.user.is_bot && !member.isHided);
    let randomMember = filteredMembers[getRandom(0, filteredMembers.length - 1)];
    if (!session.timerTitleCallback || new Date().getTime() >= session.timerTitleCallback) {

        session.timerTitleCallback = new Date().getTime() + 10 * 60 * 1000;
        message = `Сегодня ты, @${getUserName(randomMember, "nickname")} - ${title}`;

        if (!data.titles[msg.chat.id]) {
            data.titles[msg.chat.id].push(message.replace("@", ""));
        } else {
            data.titles[msg.chat.id].unshift(message.replace("@", ""));
        }

        while (data.titles[msg.chat.id].length > 15) {
            data.titles[msg.chat.id].pop();
        }

    } else {
        let [remain] = getTime(session.timerTitleCallback);
        message = `@${getUserName(session, "nickname")}, команду можно вызывать раз в 10 минут. Осталось: ${getStringRemainTime(remain)}`;
    }

    await sendMessageWithDelete(msg.chat.id, message, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, 60 * 1000);
}]];