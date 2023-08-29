const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const endGame = require('../../../functions/game/bowling/endGame');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/reset_bowling_game\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    endGame(session);

    await sendMessageWithDelete(msg.chat.id, `Сессия игры в боулинг сброшена.`, {}, 3000);
}]];