import getUserName from '../../getters/getUserName.js';
import getEmoji from '../../getters/getEmoji.js';
import calcGearScore from '../../../functions/game/player/calcGearScore.js';

export default function (session, isBot) {
    if (isBot) {
        return `Игрок №${session.name}
${getEmoji("lvl")} Уровень: ${session.stats.lvl}
${getEmoji(session.gameClass.stats.name)} Класс: ${session.gameClass.stats.translateName}
${getEmoji("gearScore")} Рейтинг снаряжения: ${calcGearScore(session)}`;
    }

    return `${getUserName(session, "name")}
${getEmoji("lvl")} Уровень: ${session.game.stats.lvl}
${getEmoji(session.game.gameClass.stats.name)} Класс: ${session.game.gameClass.stats.translateName}
${getEmoji("gearScore")} Рейтинг снаряжения: ${calcGearScore(session.game)}`;
}