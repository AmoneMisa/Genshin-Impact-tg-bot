const sendMessageWithDelete = require('../../../functions/sendMessageWithDelete');
const isWinDices = require('../../../functions/game/dice/isWinDices');
const sendPrize = require('../../../functions/game/dice/sendPrize');
const endGame = require('../../../functions/game/dice/endGame');
const bot = require('../../../bot');

let maxPulls = 3;

module.exports = [[/^dice_pull$/, async function (session, callback) {
    if (session.userChatData.user.username !== callback.from.username) {
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
        let result = isWinDices(session.game.dice.dice, 12, 18);
        if (result) {
            let modifier = 1.2;
            sendPrize(session, modifier);
            bot.deleteMessage(chatId, callback.message.message_id);
            sendMessageWithDelete(chatId, `@${session.userChatData.user.username}, ты выиграл!\nСтавка: ${session.game.dice.bet}\nВыигрыш: ${Math.round(session.game.dice.bet * modifier)}\nВыигрышное число: ${session.game.dice.dice}`, {}, 7000);
        } else {
            bot.deleteMessage(chatId, callback.message.message_id);
            sendMessageWithDelete(chatId, `@${session.userChatData.user.username}, ты проиграл. Твоя сумма кубиков: ${session.game.dice.dice}. Ставка: ${session.game.dice.bet}`, {}, 7000);
        }

        return endGame(session);
    }
}]];