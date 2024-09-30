import synergies from '../../../template/elementsSynergy.js';

export default function (winners, gameName) {
    let str = "Список игроков:\n\n";

    for (let winner of winners) {
        let goldStr = '';

        if (winner.diffGold !== 0) {
            goldStr = `${winner.diffGold} золота`;
        }

        str += `${winner.name}: ${winner.points} очка(-ов). `;

        if (winner.isWining) {
            if (goldStr) {
                str += `Выигрыш: ${goldStr}`;
            } else {
                str += `Победитель!`;
            }
        } else {
            if (goldStr) {
                str += `Проигрыш: ${goldStr}`;
            } else {
                str += `Лууузер!`;
            }
        }

        if (gameName === "elements") {
            str += `\n${getFinishElementsMessage(winner)}\n\n`;
        }

        if (gameName === "points") {
            str += `\n`;
        }
    }

    return str;
};

function getFinishElementsMessage(winner) {
    let str = "";
    for (let element of winner.elements) {
        str += `${element}`;
    }

    let synergyStr = "\n\nСобранные синергии:";
    for (let synergy of synergies) {
        if (synergy.every(val => winner.elements.includes(val))) {
            if (synergy.length === 2) {
                synergyStr += `\n${synergy} - 10 очков;`
            }
            if (synergy.length === 3) {
                synergyStr += `\n${synergy} - 17 очков;`
            }
            if (synergy.length === 4) {
                synergyStr += `\n${synergy} - 35 очков;`
            }
        }
    }

    return str + synergyStr;
}