const synergies = require('../../../templates/elementsSynergy');

module.exports = function (players) {
    let scores = {};
    let playerElements = players;

    for (let player in playerElements) {
        scores[player] = 0;
        let elements = playerElements[player];

        // Считаем очки за набор элементов
        let uniqueElements = [...new Set(elements)];
        if (uniqueElements.length === 4) scores[player] += 10;
        else if (uniqueElements.length === 2) scores[player] += 50;
        else if (elements.filter(element => element === uniqueElements[0]).length === 3) scores[player] += 35;
        else if (uniqueElements.length === 3 && elements.filter(element => element === uniqueElements[0]).length === 2) scores[player] += 24;
        else if (uniqueElements.length === 3) scores[player] += 18;

        // Считаем очки за синергии
        for (let synergy of synergies) {
            if (synergy.every(val => elements.includes(val))) {
                if (synergy.length === 2) scores[player] += 10;
                else if (synergy.length === 3) scores[player] += 17;
                else if (synergy.length === 4) scores[player] += 35;
            }
        }
    }

    return scores;
}