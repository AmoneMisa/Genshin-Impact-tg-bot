import sendPhoto from '../../../functions/tgBotFunctions/sendPhoto.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import getBoss from '../../../functions/game/boss/getBossStatus/getAliveBoss.js';
import bossAlreadySummoned from '../../../functions/game/boss/getBossStatus/bossAlreadySummoned.js';
import summonBoss from '../../../functions/game/boss/summonBoss.js';
import getLocalImageByPath from '../../../functions/getters/getLocalImageByPath.js';
import summonBossMessage from '../../../functions/game/boss/summonBossMessage.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getChatSession from '../../../functions/getters/getChatSession.js';

export default [[/(?:^|\s)\/boss\b/, async (msg) => {
    let chatId = msg.chat.id;
    await deleteMessage(chatId, msg.message_id);
    let boss = getBoss(chatId);

    let keyboard = [[{
        text: "Нанести удар",
        callback_data: "boss.dealDamage"
    }, {
        text: "Статистика босса",
        callback_data: "boss.status"
    }], [{
        text: "Возможный дроп",
        callback_data: "boss.lootList"
    }, {
        text: "Список урона",
        callback_data: "boss.damageList"
    }]];

    if (!bossAlreadySummoned(boss)) {
        boss = await summonBoss(chatId);
    }

    let chatSession = getChatSession(chatId);


    let imagePath = getLocalImageByPath(boss.stats.lvl, `bosses/${boss.name}`);
    if (imagePath) {
        sendPhoto(msg.chat.id, imagePath, {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
            caption: `${summonBossMessage(chatId, boss, false)}`,
            reply_markup: {
                inline_keyboard: [...keyboard, [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        }).then(message => chatSession.bossMenuMessageId = message.message_id);
        return;
    }

    sendMessage(msg.chat.id, `${summonBossMessage(chatId, boss, false)}`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        reply_markup: {
            inline_keyboard: [...keyboard, [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }).then(message => chatSession.bossMenuMessageId = message.message_id);
}]];