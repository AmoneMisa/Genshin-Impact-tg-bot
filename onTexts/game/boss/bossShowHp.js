const {bosses} = require('../../../data');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const bossUsersDamage = require('../../../functions/game/boss/listUsersDamage');
const getMembers = require('../../../functions/getters/getMembers');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/boss_hp\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let members = getMembers(msg.chat.id);

    return sendMessage(msg.chat.id, `${bossUsersDamage(bosses[msg.chat.id], members)}`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];