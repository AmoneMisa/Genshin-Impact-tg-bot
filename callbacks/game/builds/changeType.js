import getBuild from '../../../functions/game/builds/getBuild.js';
import bot from '../../../bot.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getLocalImageByPath from '../../../functions/getters/getLocalImageByPath.js';
import sendPhoto from '../../../functions/tgBotFunctions/sendPhoto.js';
import buildsTemplate from '../../../template/buildsTemplate.js';
import getCaption from '../../../functions/game/builds/getCaption.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import getSession from '../../../functions/getters/getSession.js';
import editMessageCaption from '../../../functions/tgBotFunctions/editMessageCaption.js';

export default [[/^builds\.[\-0-9]+\.[^.]+\.changeType$/, async function (session, callback) {
    const [, chatId, buildName] = callback.data.match(/^builds\.([\-0-9]+)\.([^.]+)\.changeType$/);
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    let types = buildsTemplate[buildName].availableTypes;

    let buttons = [];
    let tempArray = null;
    let i = 0;

    if (Object.entries(types).length) {
        for (let [key, type] of Object.entries(types)) {

            if (build.type === key) {
                continue;
            }

            if (i % 3 === 0) {
                tempArray = [];
                buttons.push(tempArray);
            }

            tempArray.push({text: type.name, callback_data: `builds.${chatId}.${buildName}.changeType.${key}`});
            i++;
        }
    }

    buttons.push([{
        text: "Назад",
        callback_data: `builds.${chatId}.${buildName}.back`
    }], [{
        text: buttonsDictionary["ru"].close,
        callback_data: "close"
    }]);

    await editMessageCaption(getCaption(buildName, "changeType", build), {
        chat_id: callback.message.chat.id,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: buttons
        }
    }, callback.message.photo);
}], [/^builds\.[\-0-9]+\.[^.]+\.changeType\.[^.]+$/, async function (session, callback) {
    const [, chatId, buildName, typeName] = callback.data.match(/^builds\.([\-0-9]+)\.([^.]+)\.changeType\.([^.]+)$/);
    let messageId = callback.message.message_id;
    let foundedSession = await getSession(chatId, callback.from.id);

    let build = await getBuild(chatId, callback.from.id, buildName);
    if (!foundedSession.game.builds[buildName].availableTypes) {
        foundedSession.game.builds[buildName].availableTypes = Object.entries(buildsTemplate[buildName].availableTypes)
            .filter(([key, value]) => !value.isPayment)
            .map(([key, value]) => key);
    }

    if (!foundedSession.game.builds[buildName].availableTypes.includes(typeName)) {
        return sendMessageWithDelete(callback.message.chat.id, "У тебя нет этого типа здания в наличии. Чтобы его получить, зайди в магазин: /shop", {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 5 * 1000);
    }

    await editMessageCaption(getCaption(buildName, "changeType", build), {
        chat_id: callback.message.chat.id,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: [[{
                text: "Подтвердить смену",
                callback_data: `builds.${chatId}.${buildName}.changeType.${typeName}.0`
            }], [{
                text: "Назад",
                callback_data: `builds.${chatId}.${buildName}.back`
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^builds\.[\-0-9]+\.[^.]+\.changeType\.[^.]+\.0$/, async function (session, callback) {
    const [, chatId, buildName, typeName] = callback.data.match(/^builds\.([\-0-9]+)\.([^.]+)\.changeType\.([^.]+)\.0$/);
    let messageId = callback.message.message_id;
    let foundedSession = await getSession(chatId, callback.from.id);

    if (!foundedSession.game.builds[buildName].availableTypes.includes(typeName)) {
        return sendMessageWithDelete(callback.message.chat.id, "У тебя нет этого типа здания в наличии. Чтобы его получить, зайди в магазин: /shop", {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 5 * 1000);
    }
    let build = await getBuild(chatId, callback.from.id, buildName);
    build.type = typeName;
    
    let imagePath = getLocalImageByPath(build.currentLvl, `builds/${buildName}/${typeName}`);
    await deleteMessage(callback.message.chat.id, messageId);

    if (imagePath) {
        await sendPhoto(callback.message.chat.id, imagePath, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
            caption: getCaption(buildName, "home", build),
            reply_markup: {
                inline_keyboard: [[{
                    text: "Назад",
                    callback_data: `builds.${chatId}.${buildName}.back`
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    }
}]];