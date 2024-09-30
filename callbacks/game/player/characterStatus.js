import getSession from '../../../functions/getters/getSession.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import editMessageCaption from '../../../functions/tgBotFunctions/editMessageCaption.js';
import getItemString from '../../../functions/game/equipment/getItemString.js';
import lodash from 'lodash';
import inventoryTranslate from '../../../dictionaries/inventory.js';

function getKeyboard(equipmentStats, userId) {
    let buttons = [];
    let tempArray = null;
    let i = 0;

    for (let [statSlot, stat] of Object.entries(equipmentStats)) {
        if (lodash.isNull(stat)) {
            continue;
        }

        if (statSlot === "leftHand") {
            if (lodash.isEqual(equipmentStats["rightHand"], stat)) {
                continue;
            }
        }

        if (statSlot === "up") {
            if (lodash.isEqual(equipmentStats["down"], stat)) {
                continue;
            }
        }

        if (i % 3 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }

        tempArray.push({text: inventoryTranslate[statSlot], callback_data: `player.${userId}.character.${statSlot}`});
        i++;
    }

    return buttons;
}

export default [[/^player\.([\-0-9]+)\.character$/, async function (session, callback, [, userId]) {
    const foundedSession = await getSession(userId, callback.from.id);

    await editMessageCaption("В этом меню можно посмотреть статистику снаряжения своего персонажа." +
        " Выбери необходимый слот, чтобы получить информацию.", {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...getKeyboard(foundedSession.game.equipmentStats, userId), [{
                text: "Назад",
                callback_data: `player.${userId}.whoami`
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo).catch(e => console.error(e));
}], [/^player\.([\-0-9]+)\.character\.([^.]+)$/, async function (session, callback, [, userId, slot]) {
    const foundedSession = await getSession(userId, callback.from.id);

    if (lodash.isNull(foundedSession.game.equipmentStats[slot])) {
        return;
    }

    await editMessageCaption(getItemString(foundedSession.game.equipmentStats[slot]), {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: `player.${userId}.character`
            }, {
                text: "Главное меню",
                callback_data: `player.${userId}.whoami`
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo).catch(e => console.error(e));
}]];