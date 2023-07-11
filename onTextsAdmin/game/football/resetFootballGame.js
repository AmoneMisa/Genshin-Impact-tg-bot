const bot = require('../../../bot');
const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const getSession = require('../../../functions/getters/getSession');
const endGame = require('../../../functions/game/football/endGame');

module.exports = [[/(?:^|\s)\/reset_football_game\b/, async (msg) => {
    bot.deleteMessage(msg.chat.id, msg.message_id);
    let session = await getSession(msg.chat.id, msg.from.id);
    endGame(session);

    sendMessageWithDelete(msg.chat.id, `Сессия игры в футбол сброшена.`, {}, 3000);
}]];