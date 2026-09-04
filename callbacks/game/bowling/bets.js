import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getUserName from '../../../functions/getters/getUserName.js';
import checkUserCall from '../../../functions/misc/checkUserCall.js';
import loadPlayer from '../../../functions/getters/loadPlayer.js';

async function bet(session, callback, calcFunc) {
    if (!checkUserCall(callback, session)) {
        return ;
    }

    if (!session.game.hasOwnProperty('bowling')) {
        return;
    }

    const { chat, member } = await loadPlayer(callback.message.chat.id, session.userId);
    if (!member.game.hasOwnProperty('bowling')) {
        return;
    }

    let newBet = calcFunc(member.game.bowling.bet);

    if (newBet > member.game.inventory.gold) {
        await sendMessageWithDelete(callback.message.chat.id, 'Нет денег для ставки', {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 20 * 1000);
        return;
    }

    if (newBet === 0) {
        await sendMessageWithDelete(callback.message.chat.id, 'Ты не можешь умножить ставку равную 0', {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 20 * 1000);
        return;
    }

    member.game.bowling.bet = newBet;
    await chat.save();
    await updateMessage(member, callback);
}

async function updateMessage(session, callback) {
    return editMessageText(`@${await getUserName(session, "nickname")}, твоя ставка: ${session.game.bowling.bet}`, {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Ставка (+100)",
                callback_data: "bowling_bet"
            }, {
                text: "Ставка (х2)",
                callback_data: "bowling_double_bet"
            }], [{
                text: "Ставка (+1000)",
                callback_data: "bowling_thousand_bet"
            }, {
                text: "Ставка (х5)",
                callback_data: "bowling_xfive_bet"
            }], [{
                text: "Ставка (+10000)",
                callback_data: "bowling_10t_bet"
            }, {
                text: "Ставка (x10)",
                callback_data: "bowling_xten_bet"
            }], [{
                text: "Ставка (x20)",
                callback_data: "bowling_x20_bet"
            }, {
                text: "Ставка (x50)",
                callback_data: "bowling_x50_bet"
            }], [{
                text: "Всё или ничего",
                callback_data: "bowling_allin_bet"
            }]]
        }
    });
}

export default [
    [/^bowling_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet + 100);
    }],
    [/^bowling_double_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 2);
    }],
    [/^bowling_thousand_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet + 1000);
    }],
    [/^bowling_xfive_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 5);
    }],
    [/^bowling_10t_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet + 10000);
    }],
    [/^bowling_xten_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 10);
    }],
    [/^bowling_x20_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 20);
    }],
    [/^bowling_x50_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 50);
    }],
    [/^bowling_allin_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet = session.game.inventory.gold);
    }],
];