import getEmoji from '../../../functions/getters/getEmoji.js';
import sendPhoto from '../../../functions/tgBotFunctions/sendPhoto.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import getRandom from '../../../functions/getters/getRandom.js';
import getValueByChance from '../../../functions/getters/getValueByChance.js';
import getFile from '../../../functions/getters/getFile.js';

let prizes = [{
    value: {
        name: "gold",
        translatedName: "золота",
        minAmount: 57500,
        maxAmount: 428500
    },
    chance: 40
}, {
    value: {
        name: "crystals",
        translatedName: "кристаллов",
        minAmount: 150,
        maxAmount: 650,
    },
    chance: 40
}, {
    value: {
        name: "ironOre",
        translatedName: "железной руды",
        minAmount: 15,
        maxAmount: 450,
    },
    chance: 20
}];

export default [[/(?:^|\s)\/bonus\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (session.game.bonusChances <= 0) {
        await sendMessageWithDelete(msg.chat.id, `@${getUserName(session)}, твои попытки получения бонуса на сегодня исчерпаны. Попытки восстанавливаются после 00:00`, {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
            reply_markup: {
                inline_keyboard: [[{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        }, 15 * 1000);
        return;
    }

    session.game.bonusChances--;
    let randomInt = getRandom(0, 99);
    let randomPrize = getValueByChance(randomInt, prizes);
    let prizeValue = getRandom(randomPrize.minAmount, randomPrize.maxAmount);

    session.game.inventory[randomPrize.name] += prizeValue;

    const file = getFile("images/misc", "chest");

    if (file) {
        await sendPhoto(msg.chat.id, file, {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
            caption: `@${getUserName(session)}, твой выигрыш: ${getEmoji(randomPrize.name)} ${prizeValue} ${randomPrize.translatedName}!`,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        });
    } else {
        await sendMessageWithDelete(msg.chat.id, `@${getUserName(session)}, твой выигрыш: ${getEmoji(randomPrize.name)} ${prizeValue} ${randomPrize.translatedName}!`, {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
            reply_markup: {
                inline_keyboard: [[{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        }, 30 * 1000);
    }
}]];