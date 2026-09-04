import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import isWinPoints from '../../../functions/game/general/isWinByPoints.js';
import sendPrize from '../../../functions/game/general/sendPrize.js';
import endGame from '../../../functions/game/football/endGame.js';
import bot from '../../../bot.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessageTimeout from '../../../functions/tgBotFunctions/deleteMessageTimeout.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import checkUserCall from '../../../functions/misc/checkUserCall.js';
import loadPlayer from '../../../functions/getters/loadPlayer.js';

let maxPulls = 3;

export default [[/^football_pull$/, async function (session, callback) {
    if (!checkUserCall(callback, session)) {
        return ;
    }

    if (!session.game.hasOwnProperty('football')) {
        return;
    }

    let chatId = callback.message.chat.id;

    const diceMsg = await bot.sendDice(chatId, {emoji: '⚽', ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})});
    deleteMessageTimeout(chatId, diceMsg.message_id, 10 * 1000);

    const { chat, member } = await loadPlayer(chatId, session.userId);
    if (!member.game.hasOwnProperty('football')) {
        return;
    }
    member.game.football.ball += diceMsg.dice.value;
    member.game.football.counter++;
    await chat.save();

    let football = member.game.football;

    if (football.counter === maxPulls) {
        let result = isWinPoints(football.ball, 12, 15);
        if (!result) {
            await deleteMessage(chatId, callback.message.message_id);
            await sendMessageWithDelete(chatId, `@${await getUserName(session, "nickname")}, ты проиграл. Твоя сумма очков: ${football.ball}. Ставка: ${football.bet}`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
            }, 7000);
            return endGame(chatId, session.userId);
        }

        let modifier;

        if (football.ball === 15) {
            modifier = 1.7;
        } else {
            modifier = 1.25;
        }

        await sendPrize(chatId, session.userId, 'football', modifier);
        await deleteMessage(chatId, callback.message.message_id);
        await sendMessageWithDelete(chatId, `@${await getUserName(session, "nickname")}, ты выиграл!\nСтавка: ${football.bet}\nВыигрыш: ${Math.round(football.bet * modifier)}\nСумма очков: ${football.ball}`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 7000);

        return endGame(chatId, session.userId);
    }
}]];