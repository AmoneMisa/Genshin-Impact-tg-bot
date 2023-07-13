const elementsTemplate = require('../../../templates/elements');
const getRandom = require('../../getters/getRandom');

function getElement(gameSession, round) {
    if (round === 1) {
        while (true) {
            let element = elementsTemplate[getRandom(0, Object.keys(elementsTemplate).length - 1)];

            if (!gameSession.elements.usedItems.includes(element)) {
                return element;
            }
        }
    }

    return elementsTemplate[getRandom(0, Object.keys(elementsTemplate).length - 1)];
}

module.exports = function (gameSession, userId) {
    let players = gameSession.game.elements.players;
    let element = getElement(players);

    players[userId].elements.push(element);
    return element;
};