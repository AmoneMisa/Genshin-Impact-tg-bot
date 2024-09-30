import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import sendPhoto from '../../../functions/tgBotFunctions/sendPhoto.js';
import getUserName from '../../../functions/getters/getUserName.js';
import getFile from '../../../functions/getters/getFile.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import fs from 'fs';

const categoriesMap = {
    boss: "Всё для босса",
    player: "Всё для игрока",
    sword: "Всё для мечей",
    misc: "Разное",
    builds: "Всё для построек",
};

function buildKeyboard(chatId) {
    let buttons = [];
    for (let [key, value] of Object.entries(categoriesMap)) {
        buttons.push([{text: value, callback_data: `shop.${chatId}.${key}`}]);
    }

    return buttons;
}

export default [[/(?:^|\s)\/shop\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    const file = getFile( "images/misc", "shop");

    if (file) {
        await sendPhoto(msg.from.id, file, {
            caption: `@${getUserName(session, "nickname")}, выбери категорию для покупки в магазине.\nВсе товары доступны раз в неделю. Таймер обновляется в 00.00 понедельника.`,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: controlButtons(`shop.${msg.chat.id}`, buildKeyboard(msg.chat.id), 1)
            }
        });
    } else {
        await sendMessage(msg.from.id, `@${getUserName(session, "nickname")}, выбери категорию для покупки в магазине.\nВсе товары доступны раз в неделю. Таймер обновляется в 00.00 понедельника.`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: controlButtons(`shop.${msg.chat.id}`, buildKeyboard(msg.chat.id), 1)
            }
        });
    }
}]];