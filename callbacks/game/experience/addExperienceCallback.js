const sendMessage = require("../../../functions/sendMessage");
const debugMessage = require("../../../functions/debugMessage");
const getSession = require("../../../functions/getSession");
const setLevel = require('../../../functions/game/boss/setLevel');

module.exports = [[/^add_experience\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
    console.log(1);
    try {
        console.log(callback);
        const [, chatId, userId] = callback.data.match(/^add_experience\.([\-0-9]+)\.([0-9]+)$/);
        console.log(chatId, userId);
        let targetSession = await getSession(chatId, userId);
        targetSession.game.stats.currentExp += 1000;
        setLevel(targetSession);
        sendMessage(callback.message.chat.id, `Добавлено 1000 опыта для ${targetSession.userChatData.user.first_name}.`);
    } catch (e) {
        debugMessage(`Command: add_experience - callback\nIn: ${callback.message.chat.id} - ${callback.message.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];