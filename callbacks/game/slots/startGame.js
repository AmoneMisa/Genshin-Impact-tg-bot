const sendMessage = require('../../../functions/sendMessage');
const retryBotRequest = require("../../../functions/retryBotRequest");
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');

module.exports = [
    [/^slots_start_game$/, async function (session, callback) {
        if (session.userChatData.user.username !== callback.from.username) {
            return;
        }

        if (!session.game.hasOwnProperty('slots')) {
            return;
        }

        if (session.game.slots.state !== 'wait_start') {
            return;
        }


        session.game.slots.state = 'spin1';
        retryBotRequest(bot => bot.deleteMessage(callback.message.chat.id, callback.message.message_id));

        let spinSet = ['😈', '❤️', '💋', '🤏', '🛫', '🚗', '💩', '👻', '👽', '☠️'];
        let isWin = Math.random() < 0.2;
        let resultSpins = [];

        function isWinSpins(spins) {
            let spin = spins[0];

            for (let i = 1; i < spins.length; i++) {
                if (spins[i] !== spin) {
                    return false;
                }
            }

            return true;
        }

        if (isWin) {
            let spin = spinSet[Math.floor(spinSet.length * Math.random())];
            resultSpins.push(spin, spin, spin);
        } else {
            do {
                resultSpins = [];

                for (let i = 0; i < 3; i++) {
                    resultSpins.push(spinSet[Math.floor(spinSet.length * Math.random())]);
                }
            } while (isWinSpins(resultSpins));
        }

        let sentMessage = await sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, ${resultSpins.slice(0, 1).join('')}`);
        setTimeout(async () => {
            if (!session.game.hasOwnProperty('slots')) {
                return;
            }

            if (session.game.slots.state !== 'spin1') {
                return;
            }

            session.game.slots.state = 'spin2';

            await retryBotRequest(bot => bot.editMessageText(`@${session.userChatData.user.username}, ${resultSpins.slice(0, 2).join('')}`, {
                chat_id: sentMessage.chat.id,
                message_id: sentMessage.message_id,
            }));
            setTimeout(async () => {
                if (!session.game.hasOwnProperty('slots')) {
                    return;
                }

                if (session.game.slots.state !== 'spin2') {
                    return;
                }

                session.game.slots.state = 'end_game';
                let text;

                if (isWin) {
                    let prize = session.game.slots.bet * 1.5;
                    session.game.inventory.gold += prize;
                    text = `@${session.userChatData.user.username}, ${resultSpins.join('')} - ты выиграл. Выигрыш: ${prize}`;
                } else {
                    text = `@${session.userChatData.user.username}, ${resultSpins.join('')} - ты проиграл. Проигрыш: ${session.game.slots.bet}`;
                }

                await retryBotRequest(bot => bot.editMessageText(text, {
                    chat_id: sentMessage.chat.id,
                    message_id: sentMessage.message_id,
                }));
                deleteMessageTimeout(sentMessage.chat.id, sentMessage.message_id, 60 * 1000);
                delete session.game.slots;
            }, 1500);
        }, 1500);
    }],
];