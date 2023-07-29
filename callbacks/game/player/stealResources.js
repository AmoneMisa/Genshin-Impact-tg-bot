const controlButtons = require('../../../functions/keyboard/controlButtons');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const getUserName = require('../../../functions/getters/getUserName');
const editMessageText = require('../../../functions/tgBotFunctions/editMessageText');
const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const getSession = require('../../../functions/getters/getSession');
const stealResources = require('../../../functions/game/builds/stealResources');
const getEmoji = require("../../../functions/getters/getEmoji");
const getTime = require("../../../functions/getters/getTime");
const getStringRemainTime = require("../../../functions/getters/getStringRemainTime");

function getRemainHpInPercent(maxHp, remainHp) {
    return (remainHp / maxHp * 100).toFixed(2);
}

module.exports = [[/^steal_resources\.([0-9]+)$/, async function (session, callback, [, userId]) {
    let targetSession = await getSession(callback.message.chat.id, userId);
    let stealResult = stealResources(session, targetSession);
    let message;
    let [remain] = getTime(targetSession.game.builds.stealImmuneTimer);

    if (!session.game.builds.chanceToSteal && session.game.builds.chanceToSteal !== 0) {
        session.game.builds.chanceToSteal = 2;
    }

    if (session.game.builds.chanceToSteal === 0) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(session, "nickname")}, у тебя на данный момент нет попыток ограбления. Попытки восстанавливаются после 00.00 каждый день.`, {}, 15 * 1000);
    }

    if (stealResult.resultCode === 1) {
        message = `\nУ пользователя защита, нельзя воровать ресурсы. Осталось действия щита: ${getStringRemainTime(remain)}`;
    } else if (stealResult.resultCode === 2) {
        message = `\nТы проиграл бой и возвращаешься ни с чем.\nОставшееся ${getEmoji("hp")} хп защитника: ${getRemainHpInPercent(targetSession.game.gameClass.stats.maxHp, stealResult.remainHp)}%`;
    } else {
        message = `\nТы украл:\n${getEmoji("gold")} ${stealResult.goldToSteal} золота
${getEmoji("ironOre")} ${stealResult.ironOreToSteal} железной руды
${getEmoji("crystals")} ${stealResult.crystalsToSteal} кристаллов.
Получил за грабёж: ${getEmoji("exp")} ${stealResult.gainedExp} опыта.\n\nОсталось хп у защитника: ${stealResult.remainHp}`;
        session.game.builds.chanceToSteal--;
    }

    editMessageText(`@${getUserName(session, "nickname")}, твоя попытка ограбить @${getUserName(targetSession, "nickname")}: ${message}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true
    }).catch(e => {
        console.error(e);
    });
}], [/^steal_resources\.([\-0-9]+)_([^.]+)$/, function (session, callback, [, userId, page]) {
    page = parseInt(page);
    let buttons = buildKeyboard(userId, "steal_resources");

    return editMessageText(`@${getUserName(session, "nickname")}, выбери, у кого хочешь попытаться украсть ресурсы.`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons("steal_resources", buttons, page)
            ]
        }
    });
}]];