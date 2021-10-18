const sendMessage = require("../../../functions/sendMessage");
const getSession = require("../../../functions/getSession");

module.exports = [[/^set_chest_timer\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
    try {
        const [, chatId, userId] = callback.data.match(/^set_chest_timer\.([\-0-9]+)\.([0-9]+)$/);
        let targetSession = await getSession(chatId, userId);
        targetSession.chestCounter = 0;
        targetSession.chosenChests = [];
        targetSession.chestButtons = [];
        targetSession.timerOpenChestCallback = 0;
        sendMessage(callback.message.chat.id, `Таймер сундука для ${targetSession.userChatData.user.first_name} обнулён.`);
    } catch (e) {
        console.error(e);
    }
}]];