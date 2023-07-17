const bot = require('../../../bot');
const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const getTime = require('../../../functions/getters/getTime');
let classes = require('../../../templates/classStatsTemplate');
const getUserName = require('../../../functions/getters/getUserName');
const getStringRemainTime = require("../../../functions/getters/getStringRemainTime");

module.exports = [[/(?:^|\s)\/change_class\b/, (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        if (!session.hasOwnProperty("changeClassTimer")) {
            session.changeClassTimer = 0;
        }

        let [remain] = getTime(session.changeClassTimer);

        if (remain > 0) {
            return sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, команду можно вызывать раз в неделю. Осталось: ${getStringRemainTime(remain)}`, {
                disable_notification: true
            });
        }

        let info = "";

        for (let _class of Object.values(classes)) {
            info += `${_class.translateName}:\nАтака: ${_class.attack}\nЗащита: ${_class.defence}\nКрит. урон x${_class.criticalDamage}\nКрит. шанс: ${_class.criticalChance}%\n\n`;
        }

        sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, выбери, свой класс.\n\n${info}`, {
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: [[{
                    text: "Палладин",
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
    } catch (e) {
        debugMessage(`Command: /change_class\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];