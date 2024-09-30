import getAttack from './getAttack.js';
import getDefence from './getDefence.js';
import getCriticalChance from './getCriticalChance.js';
import getCriticalDamage from './getCriticalDamage.js';
import getIncomingDamageModifier from './getIncomingDamageModifier.js';
import getAdditionalDamageMul from './getAdditionalDamageMul.js';
import getMaxHp from './getMaxHp.js';
import getMaxMp from './getMaxMp.js';
import getMaxCp from './getMaxCp.js';
import getCurrentCp from './getCurrentCp.js';
import getCurrentMp from './getCurrentMp.js';
import getCurrentHp from './getCurrentHp.js';
import getHpRestoreSpeed from './getHpRestoreSpeed.js';
import getCpRestoreSpeed from './getCpRestoreSpeed.js';
import getMpRestoreSpeed from './getMpRestoreSpeed.js';
import getBlock from './getBlock.js';
import getEvasion from './getEvasion.js';
import getAccuracy from './getAccuracy.js';
import getDamageMultiplier from './getDamageMultiplier.js';
import getEmoji from '../../../getters/getEmoji.js';
import statsDictionary from '../../../../dictionaries/statsDictionary.js';

import lodash from 'lodash';
import isHasPenalty from '../../equipment/isHasPenalty.js';

export default function (session, baseStats, playerEffects, gameClassTemplate) {
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