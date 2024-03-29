const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const deleteMessage = require('../../../functions/tgBotFunctions/deleteMessage');
const isWinPoints = require('../../../functions/game/general/isWinByPoints');
const sendPrize = require('../../../functions/game/general/sendPrize');
const endGame = require('../../../functions/game/darts/endGame');
const bot = require('../../../bot');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessageTimeout = require("../../../functions/tgBotFunctions/deleteMessageTimeout");
const checkUserCall = require("../../../functions/misc/checkUserCall");

let maxPulls = 3;

module.exports = [[/^darts_pull$/, async function (session, callback) {
    if (!checkUserCall(callback, session)) {
        return ;
    }

    if (!session.game.hasOwnProperty('darts')) {
        return;
    }

    let chatId = callback.message.chat.id;

    await bot.sendDice(chatId, {emoji: '🎯'}).then(msg => {
        deleteMessageTimeout(chatId, msg.message_id, 10 * 1000);
        session.game.darts.dart += msg.dice.value;
    });

    session.game.darts.counter++;

    if (session.game.darts.counter === maxPulls) {
        let result = isWinPoints(session.game.darts.dart, 13, 18);
        if (!result) {
            await deleteMessage(chatId, callback.message.message_id);
            await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты проиграл. Твоя сумма очков: ${session.game.darts.dart}. Ставка: ${session.game.darts.bet}`, {}, 7000);
            return endGame(session);
        }

        let modifier;
        
        if (session.game.darts.dart === 18) {
            modifier = 2;
        } else {
            modifier = 1.4;
        }
        
        sendPrize(session, modifier, 'darts');
        await deleteMessage(chatId, callback.message.message_id);
        await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты выиграл!\nСтавка: ${session.game.darts.bet}\nВыигрыш: ${Math.round(session.game.darts.bet * modifier)}\nСумма очков: ${session.game.darts.dart}`, {}, 7000);

        return endGame(session);
    }
}]];