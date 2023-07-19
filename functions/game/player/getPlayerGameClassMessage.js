const getAttack = require("./getAttack");
const getDefence = require("./getDefence");
const getDamageMultiplier = require("./getDamageMultiplier");
const getEmoji = require('../../getters/getEmoji');

module.exports = function (gameClass, baseStats, playerEffects) {
    let message = "";
    if (!gameClass || !baseStats) {
        return message;
    }

    let classStats = gameClass.stats || gameClass;
    message += `${getEmoji(classStats.name)} Класс: ${classStats.translateName}\n`;

    if (baseStats) {
        message += `${getEmoji("attack")} Атака: ${getAttack(gameClass, baseStats)}\n`;
        message += `${getEmoji("defence")} Защита: ${getDefence(gameClass, baseStats)}\n`;
    } else {
        message += `${getEmoji("attack")} Атака: ${gameClass.attack}\n`;
        message += `${getEmoji("defence")} Защита: ${gameClass.defence}\n`;
    }

    message += `${getEmoji("criticalChance")} Крит. шанс: ${classStats.criticalChance}\n`;
    message += `${getEmoji("criticalDamage")} Крит. урон x${classStats.criticalDamage}\n`;
    message += `${getEmoji("reduceIncomingDamage")} Уменьшение входящего урона: ${classStats.reduceIncomingDamage}%\n`;
    message += `${getEmoji("additionalDamage")} Увеличение урона: ${classStats.additionalDamage}%\n`;

    if (playerEffects) {
        message += `${getEmoji("damageMultiplier")} Множитель урона x${getDamageMultiplier(playerEffects)}\n`;
    } else {
        message += `${getEmoji("damageMultiplier")} Множитель урона x1\n`;
    }

    message += `${getEmoji("speed")} Скорость: ${classStats.speed}\n\n`;

    message += `${getEmoji("hp")} Хп всего: ${classStats.maxHp}.\n`;
    message += `Получено урона: ${classStats.maxHp - classStats.hp}.\n`;
    message += `Осталось хп: ${classStats.hp}\n`;
    message += `${getEmoji("hpRestoreSpeed")} Скорость восстановления хп: ${classStats.hpRestoreSpeed} ед. в сек.\n\n`;

    message += `${getEmoji("mp")} Мп всего: ${classStats.maxMp}.\n`;
    message += `Потрачено маны: ${classStats.maxMp - classStats.mp}.\n`;
    message += `Осталось мп: ${classStats.mp}\n`;
    message += `${getEmoji("mpRestoreSpeed")} Скорость восстановления мп: ${classStats.mpRestoreSpeed} ед. в сек. \n\n`;
    return message;
}