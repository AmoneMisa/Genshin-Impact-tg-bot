import getEmoji from '../../../getters/getEmoji.js';
import statsDictionary from '../../../../dictionaries/statsDictionary.js';

export default function (boss) {
    if (!boss) {
        throw new Error("Босс не найден");
    }

    let str = `${getEmoji("hp")} ${statsDictionary["maxHp"]}: ${boss.hp}\n${statsDictionary["hp"]}: ${boss.currentHp}\n`;
    for (let [key, stat] of Object.entries(boss.stats)) {
        if (key === "needSummons") {
            stat = stat - boss.stats.currentSummons;
        }
        str += `${getEmoji(key)} ${statsDictionary[key]}: ${Math.ceil(stat)}\n`;
    }

    return str;
}