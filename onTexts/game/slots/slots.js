import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import retryBotRequest from '../../../functions/tgBotFunctions/retryBotRequest.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/slots\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (session.game.hasOwnProperty('slots')) {
        if (new Date().getTime() - session.game.slots.startedAt <= 2 * 60 * 1000) {
            await sendMessageWithDelete(msg.chat.id, `Игра в слоты уже идёт, @${getUserName(session, "nickname")}`, {
                ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
            }, 20 * 1000);
            return;
        }
    }

    session.game.slots = {
        state: 'bets',
        bet: 0,
        startedAt: new Date().getTime()
    };

    const sentMessage = await sendMessage(msg.chat.id, `Ставка: ${session.game.slots.bet}`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Ставка (+100)",
                callback_data: "slots_bet"
            }, {
                text: "Ставка (х2)",
                callback_data: "slots_double_bet"
            }], [{
                text: "Ставка (+1000)",
                callback_data: "slots_thousand_bet"
            }, {
                text: "Ставка (х5)",
                callback_data: "slots_xfive_bet"
            }], [{
                text: "Ставка (+10000)",
                callback_data: "slots_10t_bet"
            }, {
                text: "Ставка (x10)",
                callback_data: "slots_xten_bet"
            }], [{
                text: "Ставка (x20)",
                callback_data: "slots_x20_bet"
            }, {
                text: "Ставка (x50)",
                callback_data: "slots_x50_bet"
            }], [{
                text: "Всё или ничего",
                callback_data: "slots_allin_bet"
            }]]
        }
    });
    setTimeout(() => {
        if (!session.game.hasOwnProperty('slots')) {
            return;
        }

        if (session.game.slots.state !== 'bets') {
            return;
        }

        session.game.inventory.gold -= session.game.slots.bet;
        session.game.slots.state = 'wait_start';

        retryBotRequest(bot => bot.editMessageReplyMarkup({
            inline_keyboard: [[{
                text: "Сделать спин",
                callback_data: "slots_start_game"
            }]]
        }, {
            chat_id: sentMessage.chat.id,
            message_id: sentMessage.message_id,
            disable_notification: true
        }));
    }, 15 * 1000);
}]];