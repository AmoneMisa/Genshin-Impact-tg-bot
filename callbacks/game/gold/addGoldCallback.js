const sendMessage = require("../../../functions/sendMessage");
const getSession = require("../../../functions/getSession");

module.exports = [[/^add_gold\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
    try {
        const [, chatId, userId] = callback.data.match(/^add_gold\.([\-0-9]+)\.([0-9]+)$/);
        let targetSession = await getSession(chatId, userId);
        targetSession.game.inventory.gold += 1000;
        sendMessage(callback.message.chat.id, `Добавить 1000 золота для ${targetSession.userChatData.user.first_name}.`);
    } catch (e) {
        console.error(e);
    }
}]];