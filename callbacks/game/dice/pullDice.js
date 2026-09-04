import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import isWinPoints from '../../../functions/game/general/isWinByPoints.js';
import sendPrize from '../../../functions/game/general/sendPrize.js';
import endGame from '../../../functions/game/dice/endGame.js';
import bot from '../../../bot.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessageTimeout from '../../../functions/tgBotFunctions/deleteMessageTimeout.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import checkUserCall from '../../../functions/misc/checkUserCall.js';
import loadPlayer from '../../../functions/getters/loadPlayer.js';

let maxPulls = 3;

export default [[/^dice_pull$/, async function (session, callback) {
    if (!checkUserCall(callback, session)) {
        return ;
    }

    if (!session.game.hasOwnProperty('dice')) {
        return;
    }

    let chatId = callback.message.chat.id;

    const diceMsg = await bot.sendDice(chatId, {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
    });
    deleteMessageTimeout(chatId, diceMsg.message_id, 10 * 1000);

    const { chat, member } = await loadPlayer(chatId, session.userId);
    if (!member.game.hasOwnProperty('dice')) {
        return;
    }
    member.game.dice.dice += diceMsg.dice.value;
    member.game.dice.counter++;
    await chat.save();

    let dice = member.game.dice;

    if (dice.counter === maxPulls) {
        let result = isWinPoints(dice.dice, 12, 18);
        if (result) {
            let modifier = 1.2;
            await sendPrize(chatId, session.userId, 'dice', modifier);
            await deleteMessage(chatId, callback.message.message_id);
            await sendMessageWithDelete(chatId, `@${await getUserName(session, "nickname")}, ты выиграл!\nСтавка: ${dice.bet}\nВыигрыш: ${Math.round(dice.bet * modifier)}\nВыигрышное число: ${dice.dice}`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
            }, 7000);
        } else {
            await deleteMessage(chatId, callback.message.message_id);
            await sendMessageWithDelete(chatId, `@${await getUserName(session, "nickname")}, ты проиграл. Твоя сумма кубиков: ${dice.dice}. Ставка: ${dice.bet}`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
            }, 7000);
        }

        return endGame(chatId, session.userId);
    }
}]];