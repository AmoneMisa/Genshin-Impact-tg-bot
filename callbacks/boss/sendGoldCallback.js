const sendMessage = require('../../functions/sendMessage');
const {sessions} = require('../../data');
const bot = require('../../bot');

module.exports = [[/^send_gold_recipient\.[^.]+$/, function (session, callback) {
    const [, userId] = callback.data.match(/^send_gold_recipient\.([^.]+)$/);

    sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, сколько хочешь передать? Можно вводить только цифры и целочисленные значения.`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            bot.removeReplyListener(id);
            let gold = parseInt(replyMsg.text);

            if (session.game.inventory.gold < gold) {
                return sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, у тебя столько нет. Посмотреть количество золота можно командой /boss_my_stats`);
            }

            if (session.game.inventory.gold >= gold) {
                if (!sessions[callback.message.chat.id][userId].game) {
                    sessions[callback.message.chat.id][userId].game = {
                        shopTimers: {
                            swordImmune: 0,
                            swordAddMM: 0,
                            addBossDmg: 0,
                            addBossCritChance: 0,
                            addBossCritDmg: 0,
                            swordAdditionalTry: 0
                        },
                        inventory: {
                            gold: gold,
                            hp_1000: null,
                            hp_3000: null
                        },
                        boss: {
                            hp: 1000,
                            damagedHp: 0,
                            bonus: {}
                        }
                    };
                } else {
                    sessions[callback.message.chat.id][userId].game.inventory.gold += gold;
                }
                session.game.inventory.gold -= gold;
            }
            bot.deleteMessage(replyMsg.chat.id, replyMsg.message_id);
            bot.deleteMessage(msg.chat.id, msg.message_id);
            return sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, ты успешно перевёл ${gold} золота. Посмотреть количество золота можно командой /boss_my_stats`, {
                disable_notification: true
            });
        });

    }).catch(e => {
        console.error(e);
    });
}]];