const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const getMemberStatus = require("../../../functions/getters/getMemberStatus");
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const getAliveBoss = require("../../../functions/game/boss/getBossStatus/getAliveBoss");

module.exports = [[/(?:^|\s)\/kill\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let boss = getAliveBoss(msg.chat.id);
    if (!boss) {
        throw new Error(`Не найден босс для команды kill в чате: ${msg.chat.id}`);
    }

    if (boss.hp === 0 && boss.currentHp === 0) {
        throw new Error(`Босс уже мёртв чате: ${msg.chat.id}`);
    }

    if (boss.skill && boss.skill.effect === "hp_regen" && boss.hpRegenIntervalId) {
        clearInterval(boss.hpRegenIntervalId);
        boss.hpRegenIntervalId = null;
    }

    boss.skill = null;
    clearInterval(boss.attackIntervalId);
    debugMessage("kill", boss.attackIntervalId);
    boss.attackIntervalId = null;
    boss.currentHp = 0;
    boss.hp = 0;
    boss.listOfDamage = [];

    await sendMessageWithDelete(msg.chat.id, "Босс убит админом.", {
        disable_notification: true
    }, 5 * 1000);
}]];