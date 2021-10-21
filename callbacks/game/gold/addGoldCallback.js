const sendMessage = require("../../../functions/sendMessage");
const getSession = require("../../../functions/getSession");

module.exports = [[/^add_gold\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
    try {
        console.log(callback);
        const [, chatId, userId] = callback.data.match(/^add_gold\.([\-0-9]+)\.([0-9]+)$/);
        let targetSession = await getSession(chatId, userId);
        targetSession.game.inventory.gold += 1000;
        sendMessage(callback.message.chat.id, `Добавлено 1000 золота для ${targetSession.userChatData.user.first_name}.`);
    } catch (e) {
        console.error(e);
    }
}]];