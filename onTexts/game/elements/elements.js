import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import getRandomElement from '../../../functions/game/elements/getRandomElement.js';
import elementsMessage from '../../../functions/game/elements/elementsMessage.js';
import botThink from '../../../functions/game/elements/botThink.js';
import updatePoints from '../../../functions/game/elements/updatePoints.js';
import getChatSession from '../../../functions/getters/getChatSession.js';
import getMembers from '../../../functions/getters/getMembers.js';
import betMessage from '../../../functions/game/general/betMessage.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import endGameTimer from '../../../functions/game/general/endGameTimer.js';
import gameStatusMessage from '../../../functions/game/general/gameStatusMessage.js';
import isMassGameAlreadyStarted from '../../../functions/game/general/isMassGameAlreadyStarted.js';
import sleep from "../../../functions/tgBotFunctions/sleep.js";
import betKeyboard from "../../../functions/game/general/betKeyboard.js";

export default [[/(?:^|\s)\/elements\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    const chatSession = await getChatSession(msg.chat.id);
    const members = await getMembers(msg.chat.id);
    const userId = session.userChatData.user.id;

    if (chatSession.game.elements.gameSessionIsStart) {
        if (Date.now() - chatSession.game.elements.gameSessionLastUpdateAt <= 2 * 60 * 1000) {
            return sendMessageWithDelete(
                msg.chat.id,
                "Игра уже идёт. Команду нельзя вызвать повторно до окончания игры.",
                { ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}) },
                7000
            );
        }
    }

    if (isMassGameAlreadyStarted(chatSession)) {
        return sendMessageWithDelete(
            msg.chat.id,
            "Одна из игр на несколько человек уже запущена. Команду нельзя вызвать до окончания групповой игры.",
            { ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}) },
            7000
        );
    }

    chatSession.game.elements.players = {
        bot: { usedItems: [], points: 0, id: "bot" }
    };

    chatSession.game.elements.gameSessionIsStart = true;
    chatSession.game.elements.gameSessionLastUpdateAt = Date.now();

    if (!chatSession.game.elements.players[userId]) {
        chatSession.game.elements.players[userId] = {
            bet: 0,
            usedItems: [],
            points: 0,
            id: userId
        };
    }

    const message = await sendMessage(
        msg.chat.id,
        gameStatusMessage(chatSession, members, "elements"),
        {
            ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Участвовать", callback_data: "elements_enter" }],
                    [{ text: "Покинуть игру", callback_data: "elements_leave" }]
                ]
            }
        }
    );
    chatSession.game.elements.messageId = message.message_id;
    await chatSession.save();

    await sleep(15000);
    await sendMessageWithDelete(msg.chat.id, "Делайте ставки.", {
        ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {})
    }, 7000);

    await editMessageText(betMessage(chatSession.game.elements.players, members), {
        ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
        chat_id: msg.chat.id,
        message_id: chatSession.game.elements.messageId,
        reply_markup: {
            inline_keyboard: betKeyboard("elements")
        }
    });

    // запуск игры через 25 секунд после ставок
    await sleep(25000);

    for (const playerId of Object.keys(chatSession.game.elements.players)) {
        if (playerId !== "bot") {
            getRandomElement(chatSession, playerId);
        }
    }
    botThink(chatSession);
    updatePoints(chatSession.game.elements.players);
    endGameTimer(chatSession, 20000, msg.chat.id, "elements", msg.message_thread_id);

    await sendMessageWithDelete(msg.chat.id, "Игра началась. Ставки больше не принимаются.", {
        ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {})
    }, 7000);

    await editMessageText(elementsMessage(chatSession, userId), {
        ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
        chat_id: msg.chat.id,
        message_id: chatSession.game.elements.messageId,
        reply_markup: {
            inline_keyboard: [[{ text: "Стихия!", callback_data: "elements_take" }]]
        }
    });
}]];