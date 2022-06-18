const bot = require('../../../bot');
const sendMessageWithDelete = require('../../../functions/sendMessageWithDelete');
const getSession = require('../../../functions/getSession');
const endGame = require('../../../functions/game/dice/endGame');

module.exports = [[/(?:^|\s)\/reset_dice_game\b/, async (msg) => {
    bot.deleteMessage(msg.chat.id, msg.message_id);
    let session = await getSession(msg.chat.id, msg.from.id);
    endGame(session);

    sendMessageWithDelete(msg.chat.id, `Сессия игры в кубик сброшена.`, {}, 3000);
}]];