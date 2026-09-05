import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getUserName from '../../../functions/getters/getUserName.js';
import checkUserCall from '../../../functions/misc/checkUserCall.js';
import loadPlayer from '../../../functions/getters/loadPlayer.js';

async function bet(session, callback, calcFunc) {
    if (!checkUserCall(callback, session)) {
        return ;
    }

    if (!session.game.hasOwnProperty('football')) {
        return;
    }

    const { chat, member } = await loadPlayer(callback.message.chat.id, session.userId);
    if (!member.game.hasOwnProperty('football')) {
        return;
    }

    let newBet = calcFunc(member.game.football.bet);

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

    member.game.football.bet = newBet;
    await chat.save();
    await updateMessage(member, callback);
}

async function updateMessage(session, callback) {
    return editMessageText(`@${await getUserName(session, "nickname")}, твоя ставка: ${session.game.football.bet}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Ставка (+100)",
                callback_data: "football_bet"
            }, {
                text: "Ставка (х2)",
                callback_data: "football_double_bet"
            }], [{
                text: "Ставка (+1000)",
                callback_data: "football_thousand_bet"
            }, {
                text: "Ставка (х5)",
                callback_data: "football_xfive_bet"
            }], [{
                text: "Ставка (+10000)",
                callback_data: "football_10t_bet"
            }, {
                text: "Ставка (x10)",
                callback_data: "football_xten_bet"
            }], [{
                text: "Ставка (x20)",
                callback_data: "football_x20_bet"
            }, {
                text: "Ставка (x50)",
                callback_data: "football_x50_bet"
            }], [{
                text: "Всё или ничего",
                callback_data: "football_allin_bet"
            }]]
        }
    });
}

export default [
    [/^football_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet + 100);
    }],
    [/^football_double_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 2);
    }],
    [/^football_thousand_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet + 1000);
    }],
    [/^football_xfive_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 5);
    }],
    [/^football_10t_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet + 10000);
    }],
    [/^football_xten_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 10);
    }],
    [/^football_x20_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 20);
    }],
    [/^football_x50_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet * 50);
    }],
    [/^football_allin_bet$/, async function (session, callback) {
        await bet(session, callback, (oldBet) => oldBet = session.game.inventory.gold);
    }],
];