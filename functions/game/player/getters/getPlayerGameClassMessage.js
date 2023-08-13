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
const getHpRestoreSpeed = require("./getHpRestoreSpeed");
const getCpRestoreSpeed = require("./getCpRestoreSpeed");
const getMpRestoreSpeed = require("./getMpRestoreSpeed");
const getBlock = require("./getBlock");
const getEvasion = require("./getEvasion");
const getAccuracy = require("./getAccuracy");
const getDamageMultiplier = require("./getDamageMultiplier");
const getEmoji = require('../../../getters/getEmoji');
const statsDictionary = require("../../../../dictionaries/statsDictionary");

const lodash = require("lodash");
const isHasPenalty = require("../../equipment/isHasPenalty");

module.exports = function (session, baseStats, playerEffects, gameClassTemplate) {
    let message = "";
    let gameClass = session.game.gameClass;

    if (!gameClass || !baseStats) {
        return message;
    }

    let classStats;
    if (lodash.isNull(gameClassTemplate) || lodash.isUndefined(gameClassTemplate)) {
        classStats = gameClass.stats || gameClass;
    } else {
        classStats = gameClassTemplate.stats || gameClassTemplate;
        gameClass = gameClassTemplate;
    }

    message += `${getEmoji(classStats.name)} Класс: ${classStats.translateName}\n`;

    if (isHasPenalty(session)) {
        message += "⛔️ Надет один или более предметов, которые выше Вашего уровня. На некоторые Ваши характеристики наложен штраф в 45%. Рекомендуем снять высокоуровневое снаряжение или поднять уровень.⛔️\n";
    }

    if (baseStats) {
        message += `${getEmoji("attack")} ${statsDictionary["attack"]}: ${getAttack(session, gameClass)}\n`;
        message += `${getEmoji("defence")} ${statsDictionary["defence"]}: ${getDefence(session, gameClass)}\n`;
    } else {
        message += `${getEmoji("attack")} ${statsDictionary["attack"]}: ${gameClass.attack}\n`;
        message += `${getEmoji("defence")} ${statsDictionary["defence"]}: ${gameClass.defence}\n`;
    }

    message += `${getEmoji("criticalChance")} ${statsDictionary["criticalChance"]}: ${getCriticalChance(session, gameClass)}%\n`;
    message += `${getEmoji("criticalDamage")} ${statsDictionary["criticalDamage"]}: ${(getCriticalDamage(session, gameClass) * 100).toFixed(2)}%\n`;
    message += `${getEmoji("incomingDamageModifier")} ${statsDictionary["incomingDamageModifier"]}: ${((1 - getIncomingDamageModifier(session, gameClass)) * 100).toFixed(2)}%\n`;
    message += `${getEmoji("additionalDamageMul")} ${statsDictionary["additionalDamageMul"]}: ${getAdditionalDamageMul(session, gameClass) * 100}%\n`;

    if (playerEffects) {
        message += `${getEmoji("damageMultiplier")} Множитель урона: x${getDamageMultiplier(playerEffects)}\n`;
    } else {
        message += `${getEmoji("damageMultiplier")} Множитель урона: x1\n`;
    }

    message += `${getEmoji("speed")} ${statsDictionary["speed"]}: ${classStats.speed}\n\n`;

    message += `${getEmoji("hp")} ${statsDictionary["maxHp"]}: ${getMaxHp(session, gameClass)}.\n`;
    message += `${statsDictionary["hp"]}: ${getCurrentHp(session, gameClass)}\n`;
    message += `${getEmoji("hpRestoreSpeed")} ${statsDictionary["hpRestoreSpeed"]}: ${getHpRestoreSpeed(session, classStats)} ед. в сек.\n\n`;

    message += `${getEmoji("mp")} ${statsDictionary["maxMp"]}: ${getMaxMp(session, gameClass)}.\n`;
    message += `${statsDictionary["mp"]}: ${getCurrentMp(session, gameClass)}\n`;
    message += `${getEmoji("mpRestoreSpeed")} ${statsDictionary["mpRestoreSpeed"]}: ${getMpRestoreSpeed(session, classStats)} ед. в сек. \n\n`;

    message += `${getEmoji("cp")} ${statsDictionary["maxCp"]}: ${getMaxCp(session, gameClass)}.\n`;
    message += `${statsDictionary["cp"]}: ${getCurrentCp(session, gameClass)}\n`;
    message += `${getEmoji("cpRestoreSpeed")} ${statsDictionary["cpRestoreSpeed"]}: ${getCpRestoreSpeed(session, classStats)} ед. в сек. \n\n`;

    message += `${getEmoji("accuracy")} ${statsDictionary["accuracy"]}: ${getAccuracy(session, classStats)}\n`;
    message += `${getEmoji("evasion")} ${statsDictionary["evasion"]}: ${getEvasion(session, classStats)}\n`;
    message += `${getEmoji("block")} ${statsDictionary["block"]}: ${getBlock(session, classStats)}\n\n`;
    return message;
}