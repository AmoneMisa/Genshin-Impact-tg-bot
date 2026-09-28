import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import retryBotRequest from '../../../functions/tgBotFunctions/retryBotRequest.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import sleep from "../../../functions/tgBotFunctions/sleep.js";
import betKeyboard from "../../../functions/game/general/betKeyboard.js";
import loadPlayer from "../../../functions/getters/loadPlayer.js";

export default [[/(?:^|\s)\/slots\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    let { chat, member } = await loadPlayer(msg.chat.id, session.userId);
    if (!member) {
        return;
    }

    if (member.game.slots) {
        if (Date.now() - member.game.slots.startedAt <= 2 * 60 * 1000) {
            await sendMessageWithDelete(
                msg.chat.id,
                `Игра в слоты уже идёт, @${await getUserName(session, "nickname")}`,
                { ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}) },
                20000
            );
            return;
        }
    }

    member.game.slots = {
        state: 'bets',
        bet: 0,
        startedAt: Date.now()
    };
    await chat.save();

    const sentMessage = await sendMessage(
        msg.chat.id,
        `Ставка: ${member.game.slots.bet}`,
        {
            ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
            disable_notification: true,
            reply_markup: {
                inline_keyboard: betKeyboard("slots")
            }
        }
    );

    // Жёсткая пауза 15 секунд для ставок
    await sleep(15000);

    ({ chat, member } = await loadPlayer(msg.chat.id, session.userId));

    if (!member || !member.game.slots || member.game.slots.state !== 'bets') {
        return;
    }

    member.game.inventory.gold -= member.game.slots.bet;
    member.game.slots.state = 'wait_start';
    await chat.save();

    await retryBotRequest(bot =>
        bot.editMessageReplyMarkup(
            {
                inline_keyboard: [[{ text: "Сделать спин", callback_data: "slots_start_game" }]]
            },
            {
                chat_id: sentMessage.chat.id,
                message_id: sentMessage.message_id,
                disable_notification: true
            }
        )
    );
}]];