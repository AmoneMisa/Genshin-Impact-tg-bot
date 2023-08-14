const controlButtons = require('../../../functions/keyboard/controlButtons');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const getUserName = require('../../../functions/getters/getUserName');
const getMaxHp = require('../../../functions/game/player/getters/getMaxHp');
const editMessageCaption = require('../../../functions/tgBotFunctions/editMessageCaption');
const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const getSession = require('../../../functions/getters/getSession');
const stealResources = require('../../../functions/game/builds/stealResources');
const getEmoji = require("../../../functions/getters/getEmoji");
const getTime = require("../../../functions/getters/getTime");
const getStringRemainTime = require("../../../functions/getters/getStringRemainTime");
const checkUserCall = require("../../../functions/misc/checkUserCall");

function getRemainHpInPercent(maxHp, remainHp) {
    return (remainHp / maxHp * 100).toFixed(2);
}

module.exports = [[/^stealResources\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback, [, chatId, userId]) {
    let targetSession = await getSession(chatId, userId);
    let foundSession = await getSession(chatId, callback.from.id);
    let stealResult = stealResources(foundSession, targetSession);
    let [remain] = getTime(targetSession.game.stealImmuneTimer);

    if (!foundSession.game.chanceToSteal && foundSession.game.chanceToSteal !== 0) {
        foundSession.game.chanceToSteal = 2;
    }

    if (foundSession.game.chanceToSteal === 0) {
        return sendMessageWithDelete(callback.message.chat.id, `У тебя на данный момент нет попыток ограбления. Попытки восстанавливаются после 00.00 каждый день.`, {}, 15 * 1000);
    }

    let message;
    if (stealResult.resultCode === 1) {
        message = `\nУ пользователя защита, нельзя воровать ресурсы. Осталось действия щита: ${getStringRemainTime(remain)}`;
    } else if (stealResult.resultCode === 2) {
        message = `\nТы проиграл бой и возвращаешься ни с чем.\nОставшееся ${getEmoji("hp")} хп защитника: ${getRemainHpInPercent(getMaxHp(targetSession, targetSession.game.gameClass), stealResult.remainHp)}%`;
        foundSession.game.chanceToSteal--;
        foundSession.game.stealImmuneTimer = 0;
    } else {
        message = `\nТы украл:\n${getEmoji("gold")} ${stealResult.goldToSteal} золота
${getEmoji("ironOre")} ${stealResult.ironOreToSteal} железной руды
${getEmoji("crystals")} ${stealResult.crystalsToSteal} кристаллов.
Получил за грабёж: ${getEmoji("exp")} ${stealResult.gainedExp} опыта.\n\nОсталось хп у защитника: ${stealResult.remainHp}`;
        foundSession.game.chanceToSteal--;
        foundSession.game.stealImmuneTimer = 0;
    }

    await editMessageCaption(`Твоя попытка ограбить @${getUserName(targetSession, "nickname")}: ${message}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true
    }, callback.message.photo).catch(e => {
        console.error(e);
    });
}], [/^stealResources\.([\-0-9]+)_([^.]+)$/, async function (session, callback, [, chatId, page]) {
    if (!checkUserCall(callback, session)) {
        return;
    }

    page = parseInt(page);
    let buttons = buildKeyboard(chatId, `stealResources.${chatId}`, false, callback.from.id);

    await editMessageCaption(`Выбери, у кого хочешь попытаться украсть ресурсы.`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons("stealResources", buttons, page)
            ]
        }
    }, callback.message.photo);
}]];