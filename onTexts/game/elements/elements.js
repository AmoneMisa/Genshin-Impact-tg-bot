const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const editMessageText = require('../../../functions/tgBotFunctions/editMessageText');
const getRandomElement = require('../../../functions/game/elements/getRandomElement');
const elementsMessage = require('../../../functions/game/elements/elementsMessage');
const botThink = require('../../../functions/game/elements/botThink');
const updatePoints = require('../../../functions/game/elements/updatePoints');
const getChatSession = require('../../../functions/getters/getChatSession');
const getMembers = require('../../../functions/getters/getMembers');
const betMessage = require('../../../functions/game/general/betMessage');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const endGameTimer = require("../../../functions/game/general/endGameTimer");
const gameStatusMessage = require("../../../functions/game/general/gameStatusMessage");
const isMassGameAlreadyStarted = require("../../../functions/game/general/isMassGameAlreadyStarted");

module.exports = [[/(?:^|\s)\/elements\b/, (msg, session) => {
    deleteMessage(msg.chat.id, msg.message_id);
    let chatSession = getChatSession(msg.chat.id);
    let members = getMembers(msg.chat.id);
    let userId = session.userChatData.user.id;

    if (chatSession.game.elements.gameSessionIsStart) {
        if (new Date().getTime() - chatSession.game.elements.gameSessionLastUpdateAt <= 2 * 60 * 1000) {
            return sendMessageWithDelete(msg.chat.id, "Игра уже идёт. Команду нельзя вызвать повторно до окончания игры.", {}, 7 * 1000);
        }
    }

    if (isMassGameAlreadyStarted(chatSession)) {
        return sendMessageWithDelete(msg.chat.id, "Одна из игр на несколько человек уже запущена. Команду нельзя вызвать до окончания групповой игры.", {}, 7 * 1000);
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

        return sendMessageWithDelete(msg.chat.id, `Игра началась. Ставки больше не принимаются.`, {}, 7 * 1000)
            .then(() => {
                editMessageText(elementsMessage(chatSession, userId), {
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

        return sendMessageWithDelete(msg.chat.id, `Делайте ставки.`, {}, 7 * 1000)
            .then(() => {
                editMessageText(betMessage(chatSession.game.elements.players, members), {
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