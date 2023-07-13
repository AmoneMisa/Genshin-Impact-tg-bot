const bot = require('../../../bot');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getChatSession = require('../../../functions/getters/getChatSession');
const getMembers = require('../../../functions/getters/getMembers');
const pointMessage = require('../../../functions/game/point21/pointMessage');
const betMessage = require('../../../functions/game/general/betMessage');
const gameStatusMessage = require('../../../functions/game/point21/gameStatusMessage');
const getCard = require('../../../functions/game/point21/getCard');
const endGameTimer = require('../../../functions/game/general/endGameTimer');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');
const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');

module.exports = [[/(?:^|\s)\/point\b/, (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let chatSession = getChatSession(msg.chat.id);
        let members = getMembers(msg.chat.id);
        let userId = session.userChatData.user.id;

        if (chatSession.game.points.gameSessionIsStart) {
            if (new Date().getTime() - chatSession.game.points.gameSessionLastUpdateAt <= 2 * 60 * 1000) {
                return sendMessage(msg.chat.id, "Игра уже идёт. Команду нельзя вызвать повторно до окончания игры.")
                    .then(message => {
                        deleteMessageTimeout(msg.chat.id, message.message_id, 7000);
                    });
            }
        }

        chatSession.game.points.gameSessionIsStart = true;
        chatSession.game.points.gameSessionLastUpdateAt = new Date().getTime();

        chatSession.game.points.players = {
            bot: {
                isPass: false,
                usedItems: []
            }
        };

        chatSession.game.points.usedItems = [];

        if (!chatSession.game.points.players[userId]) {
            chatSession.game.points.players[userId] = {
                bet: 0,
                usedItems: [],
                isPass: false
            };
        }

        sendMessage(msg.chat.id, `${gameStatusMessage(chatSession, members)}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Участвовать",
                    callback_data: "points_enter"
                }], [{
                    text: "Покинуть игру",
                    callback_data: "points_leave"
                }]]
            }
        }).then(message => chatSession.game.points.messageId = message.message_id);

        function startGame() {
            for (let playerId of Object.keys(chatSession.game.points.players)) {
                getCard(chatSession, playerId);
                getCard(chatSession, playerId);
            }

            chatSession.game.points.isStart = true;
            endGameTimer(chatSession, 20 * 1000, msg.chat.id, "points");

            return sendMessage(msg.chat.id, `Игра началась. Ставки больше не принимаются.`)
                .then(message => {
                    deleteMessageTimeout(msg.chat.id, message.message_id, 7000);
                }).then(() => {
                    bot.editMessageText(pointMessage(chatSession, userId), {
                        chat_id: msg.chat.id,
                        message_id: chatSession.game.points.messageId,
                        reply_markup: {
                            inline_keyboard: [[{
                                text: "Взять карту",
                                callback_data: "points_card"
                            }, {
                                text: "Пас",
                                callback_data: "points_pass"
                            }]]
                        }
                    });
                });
        }

        function startBet() {
            setTimeout(() => startGame(), 25 * 1000);
            return sendMessage(msg.chat.id, `Делайте ставки.`)
                .then(message => {
                    deleteMessageTimeout(msg.chat.id, message.message_id, 7000);
                }).then(() => {
                    bot.editMessageText(betMessage(chatSession.game.points.players, members), {
                        chat_id: msg.chat.id,
                        message_id: chatSession.game.points.messageId,
                        reply_markup: {
                            inline_keyboard: [[{
                                text: "Ставка (+100)",
                                callback_data: "points_bet"
                            }, {
                                text: "Ставка (х2)",
                                callback_data: "points_double_bet"
                            }], [{
                                text: "Ставка (+1000)",
                                callback_data: "points_thousand_bet"
                            }, {
                                text: "Ставка (х5)",
                                callback_data: "points_xfive_bet"
                            }], [{
                                text: "Ставка (+10000)",
                                callback_data: "points_10t_bet"
                            }, {
                                text: "Ставка (x10)",
                                callback_data: "points_xten_bet"
                            }],[{
                                text: "Ставка (x20)",
                                callback_data: "points_x20_bet"
                            }, {
                                text: "Ставка (x50)",
                                callback_data: "points_x50_bet"
                            }], [{
                                text: "Всё или ничего",
                                callback_data: "points_allin_bet"
                            }]]
                        }
                    });
                });
        }

        setTimeout(() => startBet(), 15 * 1000);
    } catch (e) {
        debugMessage(`Command: /point\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];