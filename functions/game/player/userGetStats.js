import getPlayerGameClassMessage from './getters/getPlayerGameClassMessage.js';
import getUserName from '../../getters/getUserName.js';
import getEmoji from '../../getters/getEmoji.js';
import getTime from '../../getters/getTime.js';
import getStringRemainTime from '../../getters/getStringRemainTime.js';
import calcGearScore from './calcGearScore.js';

export default function (session) {
    let game = session.game;
    let baseStats = game.stats;
    let playerEffects = game.effects;

    let message = `Статистика @${getUserName(session, "nickname")}:\n`;
    message += `${getEmoji("lvl")} Уровень: ${baseStats.lvl}\n`;
    message += `${getEmoji("currentExp")} Текущее количество опыта: ${baseStats.currentExp}\n`;
    message += `${getEmoji("needExp")} Требуемое количество опыта до следующего уровня: ${baseStats.needExp}\n\n`;

    message += `${getEmoji("gearScore")} Рейтинг снаряжения: ${calcGearScore(session.game)}\n\n`;

    message += getPlayerGameClassMessage(session, baseStats, playerEffects);

    if (session.swordImmune) {
        message += "Иммунитет к выпадению отрицательного числа при увеличении меча\n"
    }

    message += `${getEmoji("steal")} Количество попыток ограбления: ${session.game.chanceToSteal}\n`

    let [remain] = getTime(game.stealImmuneTimer);
    if (remain > 0) {
        message += `Иммунитет от ограбления: ${getStringRemainTime(remain)}\n`
    }

    return message;
};