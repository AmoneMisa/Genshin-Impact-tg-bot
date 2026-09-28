import getBuild from '../../../functions/game/builds/getBuild.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getCaption from '../../../functions/game/builds/getCaption.js';
import buildsTemplate from '../../../template/buildsTemplate.js';
import loadPlayer from '../../../functions/getters/loadPlayer.js';
import setLevel from '../../../functions/game/player/setLevel.js';
import editMessageCaption from '../../../functions/tgBotFunctions/editMessageCaption.js';

function getResourceType(buildTemplate) {
    return buildTemplate.resourcesType || (buildTemplate.type === 'experience' ? 'experience' : null);
}

export default [[/^builds\.([\-0-9]+)\.([^.]+)\.collect$/, async function (session, callback, [, chatId, buildName]) {
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    let resourcesCount = Math.ceil(Number(build.resourceCollected) || 0);

    let keyboard;
    if (resourcesCount > 0) {
        keyboard = [[{
            text: "Собрать",
            callback_data: `builds.${chatId}.${buildName}.collect.0`
        }], [{
            text: "Назад",
            callback_data: `builds.${chatId}.${buildName}.back`
        }], [{
            text: buttonsDictionary["ru"].close,
            callback_data: "close"
        }]];
    } else {
        keyboard = [[{
            text: "Назад",
            callback_data: `builds.${chatId}.${buildName}.back`
        }], [{
            text: buttonsDictionary["ru"].close,
            callback_data: "close"
        }]];
    }

    await editMessageCaption(getCaption(buildName, `collect.${resourcesCount > 0 ? 0 : 1}`, build), {
        chat_id: callback.message.chat.id,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: keyboard
        }
    }, callback.message.photo);
}], [/^builds\.([\-0-9]+)\.([^.]+)\.collect\.0$/, async function (session, callback, [, chatId, buildName]) {
    let messageId = callback.message.message_id;

    let { chat, member } = await loadPlayer(chatId, callback.from.id);
    let build = member.game.builds[buildName];

    if (build.upgradeStartedAt) {
        return sendMessageWithDelete(callback.message.chat.id, "Вы не можете собирать ресурсы со здания, которое в данный момент улучшается", {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 5000);
    }

    let buildTemplate = buildsTemplate[buildName];
    let resourcesType = getResourceType(buildTemplate);
    if (!resourcesType) {
        return sendMessageWithDelete(callback.message.chat.id, "Это здание не производит собираемые ресурсы.", {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 5000);
    }

    const resourcesCount = Math.max(0, Math.ceil(Number(build.resourceCollected) || 0));
    if (resourcesCount <= 0) {
        return sendMessageWithDelete(callback.message.chat.id, "Пока нечего собирать.", {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 5000);
    }

    if (resourcesType === "experience") {
        member.game.stats.currentExp += resourcesCount;
        setLevel(member);
    } else {
        member.game.inventory[resourcesType] += resourcesCount;
    }

    build.resourceCollected = 0;
    build.lastCollectAt = Date.now();
    await chat.save();

    return editMessageCaption(getCaption(buildName, "home", build), {
        message_id: messageId,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: `builds.${chatId}.${buildName}.back`
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}]];
