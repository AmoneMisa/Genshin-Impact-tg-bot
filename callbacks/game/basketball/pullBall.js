import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import deleteMessageTimeout from '../../../functions/tgBotFunctions/deleteMessageTimeout.js';
import isWinPoints from '../../../functions/game/general/isWinByPoints.js';
import sendPrize from '../../../functions/game/general/sendPrize.js';
import endGame from '../../../functions/game/basketball/endGame.js';
import bot from '../../../bot.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import checkUserCall from '../../../functions/misc/checkUserCall.js';
import loadPlayer from '../../../functions/getters/loadPlayer.js';

let maxPulls = 3;

export default [[/^basketball_pull$/, async function (session, callback) {
    if (!await checkUserCall(callback, session)) {
        return ;
    }

    if (!session.game.hasOwnProperty('basketball')) {
        return;
    }

    let chatId = callback.message.chat.id;

    const diceMsg = await bot.sendDice(chatId, {emoji: '🏀',
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})});
    deleteMessageTimeout(chatId, diceMsg.message_id, 10 * 1000);

    const { chat, member } = await loadPlayer(chatId, session.userId);
    if (!member.game.hasOwnProperty('basketball')) {
        return;
    }
    member.game.basketball.ball += diceMsg.dice.value;
    member.game.basketball.counter++;
    await chat.save();

    let basketball = member.game.basketball;

    if (basketball.counter === maxPulls) {
        let result = isWinPoints(basketball.ball, 12, 15);
        if (!result) {
            deleteMessage(chatId, callback.message.message_id)
            await sendMessageWithDelete(chatId, `@${await getUserName(session, "nickname")}, ты проиграл. Твоя сумма очков: ${basketball.ball}. Ставка: ${basketball.bet}`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
            }, 7000);
            return endGame(chatId, session.userId);
        }

        let modifier;

        if (basketball.ball === 15) {
            modifier = 1.7;
        } else {
            modifier = 1.25;
        }

        await sendPrize(chatId, session.userId, 'basketball', modifier);
        deleteMessage(chatId, callback.message.message_id)
        await sendMessageWithDelete(chatId, `@${await getUserName(session, "nickname")}, ты выиграл!\nСтавка: ${basketball.bet}\nВыигрыш: ${Math.round(basketball.bet * modifier)}\nСумма очков: ${basketball.ball}`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 7000);

        return endGame(chatId, session.userId);
    }
}]];