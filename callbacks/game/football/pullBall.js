const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const isWinPoints = require('../../../functions/game/general/isWinByPoints');
const sendPrize = require('../../../functions/game/general/sendPrize');
const endGame = require('../../../functions/game/football/endGame');
const bot = require('../../../bot');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessageTimeout = require("../../../functions/tgBotFunctions/deleteMessageTimeout");
const deleteMessage = require('../../../functions/tgBotFunctions/deleteMessage');
const checkUserCall = require("../../../functions/misc/checkUserCall");

let maxPulls = 3;

module.exports = [[/^football_pull$/, async function (session, callback) {
    if (!checkUserCall(callback, session)) {
        return ;
    }

    if (!session.game.hasOwnProperty('football')) {
        return;
    }

    let chatId = callback.message.chat.id;

    await bot.sendDice(chatId, {emoji: '⚽'}).then(msg => {
        deleteMessageTimeout(chatId, msg.message_id, 10 * 1000);
        session.game.football.ball += msg.dice.value;
    });

    session.game.football.counter++;

    if (session.game.football.counter === maxPulls) {
        let result = isWinPoints(session.game.football.ball, 12, 15);
        if (!result) {
            await deleteMessage(chatId, callback.message.message_id);
            await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты проиграл. Твоя сумма очков: ${session.game.football.ball}. Ставка: ${session.game.football.bet}`, {}, 7000);
            return endGame(session);
        }

        let modifier;
        
        if (session.game.football.ball === 15) {
            modifier = 1.7;
        } else {
            modifier = 1.25;
        }
        
        sendPrize(session, modifier, 'football');
        await deleteMessage(chatId, callback.message.message_id);
        await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты выиграл!\nСтавка: ${session.game.football.bet}\nВыигрыш: ${Math.round(session.game.football.bet * modifier)}\nСумма очков: ${session.game.football.ball}`, {}, 7000);

        return endGame(session);
    }
}]];