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

export default [[/(?:^|\s)\/elements\b/, (msg, session) => {
    deleteMessage(msg.chat.id, msg.message_id);
    let chatSession = getChatSession(msg.chat.id);
    let members = getMembers(msg.chat.id);
    let userId = session.userChatData.user.id;

    if (chatSession.game.elements.gameSessionIsStart) {
        if (new Date().getTime() - chatSession.game.elements.gameSessionLastUpdateAt <= 2 * 60 * 1000) {
            return sendMessageWithDelete(msg.chat.id, "Игра уже идёт. Команду нельзя вызвать повторно до окончания игры.", {
                ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
            }, 7 * 1000);
        }
    }

    if (isMassGameAlreadyStarted(chatSession)) {
        return sendMessageWithDelete(msg.chat.id, "Одна из игр на несколько человек уже запущена. Команду нельзя вызвать до окончания групповой игры.", {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
        }, 7 * 1000);
    }

    chatSession.game.elements.players = {
        bot: {
            usedItems: [],
            points: 0,
            id: "bot"
        }
    };

    chatSession.game.elements.gameSessionIsStart = true;
    chatSession.game.elements.gameSessionLastUpdateAt = new Date().getTime();

    if (!chatSession.game.elements.players[userId]) {
        chatSession.game.elements.players[userId] = {
            bet: 0,
            usedItems: [],
            points: 0,
            id: userId
        };
    }

    sendMessage(msg.chat.id, `${gameStatusMessage(chatSession, members, "elements")}`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Участвовать",
                callback_data: "elements_enter"
            }], [{
                text: "Покинуть игру",
                callback_data: "elements_leave"
            }]]
        }
    }).then(message => chatSession.game.elements.messageId = message.message_id);

    function startGame() {
        for (let playerId of Object.keys(chatSession.game.elements.players)) {
            if (playerId === "bot") {
                continue;
            }

            getRandomElement(chatSession, playerId);
        }

        botThink(chatSession);
        updatePoints(chatSession.game.elements.players);
        endGameTimer(chatSession, 20 * 1000, msg.chat.id, "elements");

        return sendMessageWithDelete(msg.chat.id, `Игра началась. Ставки больше не принимаются.`, {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
        }, 7 * 1000)
            .then(() => {
                editMessageText(elementsMessage(chatSession, userId), {
                    ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
                    chat_id: msg.chat.id,
                    message_id: chatSession.game.elements.messageId,
                    reply_markup: {
                        inline_keyboard: [[{
                            text: "Стихия!",
                            callback_data: "elements_take"
                        }]]
                    }
                });
            });
    }

    function startBet() {
        chatSession.game.elements.startGameTimeout = +setTimeout(() => startGame(), 25 * 1000);

        return sendMessageWithDelete(msg.chat.id, `Делайте ставки.`, {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
        }, 7 * 1000)
            .then(() => {
                editMessageText(betMessage(chatSession.game.elements.players, members), {
                    ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
                    chat_id: msg.chat.id,
                    message_id: chatSession.game.elements.messageId,
                    reply_markup: {
                        inline_keyboard: [[{
                            text: "Ставка (+100)",
                            callback_data: "elements_bet"
                        }, {
                            text: "Ставка (х2)",
                            callback_data: "elements_double_bet"
                        }], [{
                            text: "Ставка (+1000)",
                            callback_data: "elements_thousand_bet"
                        }, {
                            text: "Ставка (х5)",
                            callback_data: "elements_xfive_bet"
                        }], [{
                            text: "Ставка (+10000)",
                            callback_data: "elements_10t_bet"
                        }, {
                            text: "Ставка (x10)",
                            callback_data: "elements_xten_bet"
                        }], [{
                            text: "Ставка (x20)",
                            callback_data: "elements_x20_bet"
                        }, {
                            text: "Ставка (x50)",
                            callback_data: "elements_x50_bet"
                        }], [{
                            text: "Всё или ничего",
                            callback_data: "elements_allin_bet"
                        }]]
                    }
                });
            });
    }

    chatSession.game.elements.startBetTimeout = +setTimeout(() => startBet(), 15 * 1000);
}]];