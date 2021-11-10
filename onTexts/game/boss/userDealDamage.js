const bot = require('../../../bot');
const {bosses} = require('../../../data');
const sendMessage = require('../../../functions/sendMessage');
const debugMessage = require('../../../functions/debugMessage');
const getTime = require('../../../functions/getTime');


module.exports = [[/(?:^|\s)\/damage_the_boss\b/, (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        if (!session.timerBossCallback) {
            session.timerBossCallback = 0;
        }

        let [remain, hours, minutes, seconds] = getTime(session.timerBossCallback);

        if (remain > 0) {
            if (hours > 0) {
                sendMessage(msg.chat.id, `@${session.userChatData.user.username}, команду можно вызывать раз в час. Осталось: ${hours} ч ${minutes} мин ${seconds} сек`);
            } else if (minutes > 0) {
                sendMessage(msg.chat.id, `@${session.userChatData.user.username}, команду можно вызывать раз в час. Осталось: ${minutes} мин ${seconds} сек`);
            } else {
                sendMessage(msg.chat.id, `@${session.userChatData.user.username}, команду можно вызывать раз в час. Осталось: ${seconds} сек`);
            }
            return;
        }

        let boss = bosses[msg.chat.id];

        if (!boss) {
            sendMessage(msg.chat.id, `Группа ещё не призвала босса. Призвать можно командой /summon_boss`);
            return false;
        }

        if (boss.hp <= boss.damagedHp) {
            sendMessage(msg.chat.id, `Лежачих не бьют. Призвать можно командой /summon_boss`);
            return false;
        }

        if (session.game.boss.hp <= session.game.boss.damagedHp) {
            sendMessage(msg.chat.id, `Ты немножко труп. Жди следующего призыва босса`);
            return false;
        }

        function buildKeyboard() {
            let buttonsSkills = [];
            for (let skill of session.game.gameClass.skills) {
                buttonsSkills.push([{text: skill.name, callback_data: `skill.${skill.slot}`}]);
            }

            return buttonsSkills;
        }

        let message = "";

        for (let skill of session.game.gameClass.skills) {
            message += `${skill.name} - ${skill.description} Стоимость использования: ${skill.cost} золота, ${skill.crystalCost} кристаллов.\n\n`;
        }

        sendMessage(msg.chat.id, `@${session.userChatData.user.username}, выбери скилл:\n${message}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: buildKeyboard()
            }
        });

    } catch (e) {
        debugMessage(`Command: /damage_the_boss\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];