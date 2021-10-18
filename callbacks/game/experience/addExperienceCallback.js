const sendMessage = require("../../../functions/sendMessage");
const getSession = require("../../../functions/getSession");
const setLevel = require('../../../functions/game/boss/setLevel');

module.exports = [[/^add_experience\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
    try {
        const [, chatId, userId] = callback.data.match(/^add_experience\.([\-0-9]+)\.([0-9]+)$/);
        let targetSession = await getSession(chatId, userId);
        targetSession.game.stats.currentExp += 1000;
        setLevel(targetSession);
        sendMessage(callback.message.chat.id, `Добавить 1000 опыта для ${targetSession.userChatData.user.first_name}.`);
    } catch (e) {
        console.error(e);
    }
}]];