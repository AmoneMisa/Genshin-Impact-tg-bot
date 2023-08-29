const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const endGame = require('../../../functions/game/football/endGame');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/reset_football_game\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    endGame(session);

    await sendMessageWithDelete(msg.chat.id, `Сессия игры в футбол сброшена.`, {}, 3000);
}]];