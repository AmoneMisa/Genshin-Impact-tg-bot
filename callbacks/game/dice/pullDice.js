const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const isWinPoints = require('../../../functions/game/general/isWinByPoints');
const sendPrize = require('../../../functions/game/general/sendPrize');
const endGame = require('../../../functions/game/dice/endGame');
const bot = require('../../../bot');
const getUserName = require('../../../functions/getters/getUserName');

let maxPulls = 3;

module.exports = [[/^dice_pull$/, async function (session, callback) {
    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }

    if (!session.game.hasOwnProperty('dice')) {
        return;
    }

    let chatId = callback.message.chat.id;

    await bot.sendDice(chatId).then(msg => {
        setTimeout(() => bot.deleteMessage(chatId, msg.message_id), 10000);
        session.game.dice.dice += msg.dice.value;
    });

    session.game.dice.counter++;

    if (session.game.dice.counter === maxPulls) {
        let result = isWinPoints(session.game.dice.dice, 12, 18);
        if (result) {
            let modifier = 1.2;
            sendPrize(session, modifier, 'dice');
            bot.deleteMessage(chatId, callback.message.message_id);
            sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты выиграл!\nСтавка: ${session.game.dice.bet}\nВыигрыш: ${Math.round(session.game.dice.bet * modifier)}\nВыигрышное число: ${session.game.dice.dice}`, {}, 7000);
        } else {
            bot.deleteMessage(chatId, callback.message.message_id);
            sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты проиграл. Твоя сумма кубиков: ${session.game.dice.dice}. Ставка: ${session.game.dice.bet}`, {}, 7000);
        }

        return endGame(session);
    }
}]];