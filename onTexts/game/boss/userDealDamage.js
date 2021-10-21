const userDealDamage = require('../../../functions/game/boss/userDealDamage');
const bossGetLoot = require('../../../functions/game/boss/bossGetLoot');
const bot = require('../../../bot');
const {bosses} = require('../../../data');
const sendMessage = require('../../../functions/sendMessage');
const debugMessage = require('../../../functions/debugMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const getMembers = require('../../../functions/getMembers');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');
const getTime = require('../../../functions/getTime');

function getOffset() {
    // return new Date().getTime() + 60 * 60 * 1000;
    return new Date().getTime() + 60 * 1000;
}

module.exports = [[/(?:^|\s)\/damage_the_boss\b/, (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let [remain, hours, minutes, seconds] = getTime(session.timerBossCallback);

        if (remain > 0) {
            if (hours > 0) {
                sendMessage(`@${session.userChatData.user.username}, команду можно вызывать раз в час. Осталось: ${hours} ч ${minutes} мин ${seconds} сек`);
            } else if (minutes > 0) {
                sendMessage(`@${session.userChatData.user.username}, команду можно вызывать раз в час. Осталось: ${minutes} мин ${seconds} сек`);
            } else {
                sendMessage(`@${session.userChatData.user.username}, команду можно вызывать раз в час. Осталось: ${seconds} сек`);
            }

            return;
        }

        session.timerBossCallback = getOffset();

        let boss = bosses[msg.chat.id];
        let members = getMembers(msg.chat.id);

        if (!boss) {
            sendMessage(`Группа ещё не призвала босса. Призвать можно командой /summon_boss`);
            return false;
        }

        if (boss.hp <= boss.damagedHp) {
            sendMessage(`Лежачих не бьют. Призвать можно командой /summon_boss`);
            return false;
        }

        if (session.game.boss.hp <= session.game.boss.damagedHp) {
            sendMessage(`Ты немножко труп. Надо было пить хиллки. Жди следующего призыва босса`);
            return false;
        }

        let callbackSendMessage = (message) => sendMessage(msg.chat.id, message, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        }).then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 10 * 60 * 1000));

        if (userDealDamage(session, boss, callbackSendMessage)) {
            bossGetLoot(boss, members, callbackSendMessage);

            if (boss.hasOwnProperty("setIntervalId")) {
                clearInterval(boss.setIntervalId);
                delete boss.setIntervalId;
            }
            clearInterval(boss.setAttackIntervalId);
            delete boss.setAttackIntervalId;
        }

    } catch (e) {
        debugMessage(`Command: /damage_the_boss\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];