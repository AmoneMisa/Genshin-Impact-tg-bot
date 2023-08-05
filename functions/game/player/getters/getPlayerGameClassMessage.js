const getAttack = require("./getAttack");
const getDefence = require("./getDefence");
const getCriticalChance = require("./getCriticalChance");
const getCriticalDamage = require("./getCriticalDamage");
const getReduceIncomingDamage = require("./getReduceIncomingDamage");
const getAdditionalDamage = require("./getAdditionalDamage");
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
        message += `${getEmoji("attack")} Атака: ${getAttack(gameClass, session)}\n`;
        message += `${getEmoji("defence")} Защита: ${getDefence(gameClass, session)}\n`;
    } else {
        message += `${getEmoji("attack")} Атака: ${gameClass.attack}\n`;
        message += `${getEmoji("defence")} Защита: ${gameClass.defence}\n`;
    }

    message += `${getEmoji("criticalChance")} Крит. шанс: ${getCriticalChance(gameClass, session)}%\n`;
    message += `${getEmoji("criticalDamage")} Крит. урон ${getCriticalDamage(gameClass, session) * 100}%\n`;
    message += `${getEmoji("reduceIncomingDamage")} Уменьшение входящего урона: ${getReduceIncomingDamage(gameClass, session) * 100}%\n`;
    message += `${getEmoji("additionalDamage")} Увеличение урона: ${getAdditionalDamage(gameClass, session) * 100}%\n`;

    if (playerEffects) {
        message += `${getEmoji("damageMultiplier")} Множитель урона x${getDamageMultiplier(playerEffects)}\n`;
    } else {
        message += `${getEmoji("damageMultiplier")} Множитель урона x1\n`;
    }

    message += `${getEmoji("speed")} Скорость: ${classStats.speed}\n\n`;

    message += `${getEmoji("hp")} Хп всего: ${getMaxHp(gameClass, session)}.\n`;
    message += `Получено урона: ${getMaxHp(gameClass, session) - getCurrentHp(gameClass, session)}.\n`;
    message += `Осталось хп: ${getCurrentHp(gameClass, session)}\n`;
    message += `${getEmoji("hpRestoreSpeed")} Скорость восстановления хп: ${classStats.hpRestoreSpeed} ед. в сек.\n\n`;

    message += `${getEmoji("mp")} Мп всего: ${getMaxMp(gameClass, session)}.\n`;
    message += `Потрачено маны: ${getMaxMp(gameClass, session) - getCurrentMp(gameClass, session)}.\n`;
    message += `Осталось мп: ${getCurrentMp(gameClass, session)}\n`;
    message += `${getEmoji("mpRestoreSpeed")} Скорость восстановления мп: ${classStats.mpRestoreSpeed} ед. в сек. \n\n`;

    message += `${getEmoji("cp")} Цп всего: ${getMaxCp(gameClass, session)}.\n`;
    message += `Потрачено ЦП: ${getMaxCp(gameClass, session) - getCurrentCp(gameClass, session)}.\n`;
    message += `Осталось cп: ${getCurrentCp(gameClass, session)}\n`;
    message += `${getEmoji("cpRestoreSpeed")} Скорость восстановления цп: ${classStats.mpRestoreSpeed} ед. в сек. \n\n`;
    return message;
}