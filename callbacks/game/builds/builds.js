import sendPhoto from '../../../functions/tgBotFunctions/sendPhoto.js';
import editMessageCaption from '../../../functions/tgBotFunctions/editMessageCaption.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getUserName from '../../../functions/getters/getUserName.js';
import getBuild from '../../../functions/game/builds/getBuild.js';
import getCaption from '../../../functions/game/builds/getCaption.js';
import getLocalImageByPath from '../../../functions/getters/getLocalImageByPath.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import getBuildList from '../../../functions/game/builds/getBuildList.js';
import getBuildListFromTemplate from '../../../functions/game/builds/getBuildFromTemplate.js';
import buildsTemplate from '../../../template/buildsTemplate.js';
import getSession from '../../../functions/getters/getSession.js';
import getFile from '../../../functions/getters/getFile.js';

function getUpgradeButtonText(lvl) {
    if (lvl === 0) {
        return "Построить";
    }
    return "Улучшить";
}

// Builds the home-menu keyboard for any building purely from its template
// capabilities, so adding a new building to buildsTemplate.js needs only a
// template entry (+ optional image assets) — no new callback code here.
function buildKeyboard(chatId, buildName, buildTemplate, build) {
    const rows = [[{
        text: "Статус",
        callback_data: `builds.${chatId}.${buildName}.status`,
    }, {
        text: getUpgradeButtonText(build.currentLvl),
        callback_data: `builds.${chatId}.${buildName}.upgrade`,
    }]];

    const producesResources = Boolean(buildTemplate.resourcesType) || buildTemplate.type === "experience";
    if (producesResources) {
        rows.push([{
            text: "Собрать прибыль",
            callback_data: `builds.${chatId}.${buildName}.collect`,
        }]);
    }

    if (buildTemplate.availableTypes) {
        rows.push([{
            text: "Изменить тип",
            callback_data: `builds.${chatId}.${buildName}.changeType`,
        }, {
            text: "Изменить название",
            callback_data: `builds.${chatId}.${buildName}.changeName`,
        }]);
    }

    // Guarded-warehouse status is currently palace-only (see stealResources.js /
    // calculateIncreaseGuardedResources.js — no other building models "loot
    // protected from raids"), so this stays a targeted addition rather than a
    // generic template flag.
    if (buildName === "palace") {
        rows.push([{
            text: "Статус казны",
            callback_data: `builds.${chatId}.palace.guarded`,
        }]);
    }

    // Forge item crafting/upgrading (functions/game/equipment/craftItem.js /
    // upgradeItem.js) — currently the only building that acts on the player's
    // equipment rather than its own resource production.
    if (buildName === "forge") {
        rows.push([{
            text: "Выковать",
            callback_data: `builds.${chatId}.forge.craft`,
        }, {
            text: "Улучшить снаряжение",
            callback_data: `builds.${chatId}.forge.itemUpgrade`,
        }]);
    }

    rows.push([{
        text: buttonsDictionary["ru"].close,
        callback_data: "close"
    }]);

    return rows;
}

function getBuildImageFolder(buildName, buildTemplate, build) {
    return buildTemplate.availableTypes
        ? `builds/${buildName}/${build.type || 'common'}`
        : `builds/${buildName}`;
}

export default [[/^player\.([\-0-9]+)\.builds$/, async function (session, callback, [, chatId]) {
    let id;
    let foundedSession = await getSession(chatId, callback.from.id);
    let userId = foundedSession.userChatData.user.id;
    let buildsList = await getBuildList(chatId, userId);

    let defaultBuilds = getBuildListFromTemplate();

    for (let [key, build] of Object.entries(defaultBuilds)) {
        if (buildsList[key]) {
            continue;
        }

        buildsList[key] = build;
    }

    let buttons = [];
    let tempArray = null;
    let i = 0;

    if (Object.entries(buildsList).length) {
        for (let key of Object.keys(buildsList)) {
            if (i % 3 === 0) {
                tempArray = [];
                buttons.push(tempArray);
            }

            tempArray.push({text: buildsTemplate[key].name, callback_data: `builds.${chatId}.${key}`});
            i++;
        }
    }

    buttons.push([{
        text: buttonsDictionary["ru"].close,
        callback_data: "close"
    }]);

    const file = getFile("images/misc", "builds");

    if (file) {
        sendPhoto(userId, file, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
            caption: `@${await getUserName(session, "nickname")}, выбери здание, с которым хочешь взаимодействовать`,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: buttons
            }
        }).then(message => id = message.message_id);
    } else {
        sendMessage(userId, `@${await getUserName(session, "nickname")}, выбери здание, с которым хочешь взаимодействовать`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: buttons
            }
        }).then(message => id = message.message_id);
    }
}], [/^builds\.([\-0-9]+)\.([^.]+)(?:\.back)?$/, async function (session, callback, [, chatId, buildName]) {
    const buildTemplate = buildsTemplate[buildName];
    if (!buildTemplate || !buildTemplate.available) {
        return;
    }

    const isBack = callback.data.includes("back");
    let foundedSession = await getSession(chatId, callback.from.id);

    if (!foundedSession.game.hasOwnProperty('builds')) {
        return;
    }

    let messageId = callback.message.message_id;
    let build = await getBuild(chatId, callback.from.id, buildName);
    let keyboard = buildKeyboard(chatId, buildName, buildTemplate, build);

    if (isBack) {
        await editMessageCaption(getCaption(buildName, "home", build), {
            chat_id: callback.message.chat.id,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: keyboard
            }
        }, callback.message.photo);
        return;
    }

    let imagePath = getLocalImageByPath(build.currentLvl, getBuildImageFolder(buildName, buildTemplate, build));

    if (imagePath) {
        await sendPhoto(callback.message.chat.id, imagePath, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
            caption: getCaption(buildName, "home", build), reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } else {
        await sendMessage(callback.message.chat.id, getCaption(buildName, "home", build), {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    }
}]];
