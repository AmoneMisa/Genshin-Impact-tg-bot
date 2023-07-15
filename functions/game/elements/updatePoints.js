const synergies = require('../../../templates/elementsSynergy');

module.exports = function (players) {
    for (let player of Object.values(players)) {
        player.points = 0;
        let elements = player.usedItems;

        // Считаем очки за набор элементов
        let uniqueElements = [...new Set(elements)];
        if (uniqueElements.length === 4) {
            player.points += 10;
        } else if (uniqueElements.length === 3) {
            player.points += 18;
        } else if (uniqueElements.length === 2) {
            if (elements.filter(element => element === uniqueElements[0]).length === 2) {
                player.points += 24;
            } else {
                player.points += 35;
            }
        } else if (uniqueElements.length === 1) {
            player.points += 50;
        }
        // Считаем очки за синергии
        for (let synergy of synergies) {
            if (synergy.every(val => elements.includes(val))) {
                if (synergy.length === 2) player.points += 10;
                if (synergy.length === 3) player.points += 17;
                if (synergy.length === 4) player.points += 35;
            }
        }
    }
}