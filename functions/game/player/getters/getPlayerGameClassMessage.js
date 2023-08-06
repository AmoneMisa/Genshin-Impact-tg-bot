const getAttack = require("./getAttack");
const getDefence = require("./getDefence");
const getCriticalChance = require("./getCriticalChance");
const getCriticalDamage = require("./getCriticalDamage");
const getIncomingDamageModifier = require("./getIncomingDamageModifier");
const getAdditionalDamageMul = require("./getAdditionalDamageMul");
const getMaxHp = require("./getMaxHp");
const getMaxMp = require("./getMaxMp");
const getMaxCp = require("./getMaxCp");
const getCurrentCp = require("./getCurrentCp");
const getCurrentMp = require("./getCurrentMp");
const getCurrentHp = require("./getCurrentHp");
const getDamageMultiplier = require("./getDamageMultiplier");
const getEmoji = require('../../../getters/getEmoji');

module.exports = function (session, baseStats, playerEffects, gameClassTemplate) {
    let message = "";
    let gameClass = session.game.gameClass;

    if (!gameClass || !baseStats) {
        return message;
    }

    let classStats;
    if (gameClassTemplate) {
        classStats = gameClassTemplate.stats || gameClassTemplate;
        gameClass = gameClassTemplate;
    } else {
        classStats = gameClass.stats || gameClass;
    }

    message += `${getEmoji(classStats.name)} Класс: ${classStats.translateName}\n`;

    if (baseStats) {
        message += `${getEmoji("attack")} Атака: ${getAttack(session, gameClass)}\n`;
        message += `${getEmoji("defence")} Защита: ${getDefence(session, gameClass)}\n`;
    } else {
        message += `${getEmoji("attack")} Атака: ${gameClass.attack}\n`;
        message += `${getEmoji("defence")} Защита: ${gameClass.defence}\n`;
    }

    message += `${getEmoji("criticalChance")} Крит. шанс: ${getCriticalChance(session, gameClass)}%\n`;
    message += `${getEmoji("criticalDamage")} Крит. урон ${getCriticalDamage(session, gameClass) * 100}%\n`;
    message += `${getEmoji("incomingDamageModifier")} Получаемый урон: ${((1 - getIncomingDamageModifier(session, gameClass)) * 100).toFixed(2)}%\n`;
    message += `${getEmoji("additionalDamageMul")} Дополнительный урон: ${getAdditionalDamageMul(session, gameClass) * 100}%\n`;

    if (playerEffects) {
        message += `${getEmoji("damageMultiplier")} Множитель урона x${getDamageMultiplier(playerEffects)}\n`;
    } else {
        message += `${getEmoji("damageMultiplier")} Множитель урона x1\n`;
    }

    message += `${getEmoji("speed")} Скорость: ${classStats.speed}\n\n`;

    message += `${getEmoji("hp")} Хп всего: ${getMaxHp(session, gameClass)}.\n`;
    message += `Получено урона: ${getMaxHp(session, gameClass) - getCurrentHp(session, gameClass)}.\n`;
    message += `Осталось хп: ${getCurrentHp(session, gameClass)}\n`;
    message += `${getEmoji("hpRestoreSpeed")} Скорость восстановления хп: ${classStats.hpRestoreSpeed} ед. в сек.\n\n`;

    message += `${getEmoji("mp")} Мп всего: ${getMaxMp(session, gameClass)}.\n`;
    message += `Потрачено маны: ${getMaxMp(session, gameClass) - getCurrentMp(session, gameClass)}.\n`;
    message += `Осталось мп: ${getCurrentMp(session, gameClass)}\n`;
    message += `${getEmoji("mpRestoreSpeed")} Скорость восстановления мп: ${classStats.mpRestoreSpeed} ед. в сек. \n\n`;

    message += `${getEmoji("cp")} Цп всего: ${getMaxCp(session, gameClass)}.\n`;
    message += `Потрачено ЦП: ${getMaxCp(session, gameClass) - getCurrentCp(session, gameClass)}.\n`;
    message += `Осталось cп: ${getCurrentCp(session, gameClass)}\n`;
    message += `${getEmoji("cpRestoreSpeed")} Скорость восстановления цп: ${classStats.mpRestoreSpeed} ед. в сек. \n\n`;
    return message;
}