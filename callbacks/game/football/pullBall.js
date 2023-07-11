const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const isWinPoints = require('../../../functions/game/general/isWinByPoints');
const sendPrize = require('../../../functions/game/general/sendPrize');
const endGame = require('../../../functions/game/football/endGame');
const bot = require('../../../bot');
const getUserName = require('../../../functions/getters/getUserName');

let maxPulls = 3;

module.exports = [[/^football_pull$/, async function (session, callback) {
    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }

    if (!session.game.hasOwnProperty('football')) {
        return;
    }

    let chatId = callback.message.chat.id;

    await bot.sendDice(chatId, {emoji: '⚽'}).then(msg => {
        setTimeout(() => bot.deleteMessage(chatId, msg.message_id), 10000);
        session.game.football.ball += msg.dice.value;
    });

    session.game.football.counter++;

    if (session.game.football.counter === maxPulls) {
        let result = isWinPoints(session.game.football.ball, 12, 15);
        if (!result) {
            bot.deleteMessage(chatId, callback.message.message_id);
            sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты проиграл. Твоя сумма очков: ${session.game.football.ball}. Ставка: ${session.game.football.bet}`, {}, 7000);
            return endGame(session);
        }

        let modifier;
        
        if (session.game.football.ball === 15) {
            modifier = 1.7;
        } else {
            modifier = 1.25;
        }
        
        sendPrize(session, modifier);
        bot.deleteMessage(chatId, callback.message.message_id);
        sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты выиграл!\nСтавка: ${session.game.football.bet}\nВыигрыш: ${Math.round(session.game.football.bet * modifier)}\nСумма очков: ${session.game.football.ball}`, {}, 7000);

        return endGame(session);
    }
}]];