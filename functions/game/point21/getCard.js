const getRandom = require('../../getters/getRandom');
const cardsDictionary = require('../../../dictionaries/pointCards');

function getCard(gameSession) {
    if (gameSession.game.points.usedItems.length === 36) {
        return null;
    }

    while (true) {
        let cards = `${cardsDictionary.values[getRandom(0, cardsDictionary.values.length - 1)].name} ${cardsDictionary.suits[getRandom(0, cardsDictionary.suits.length - 1)]}`;

        if (!gameSession.game.points.usedItems.includes(cards)) {
            return cards;
        }
    }
}

module.exports = function (gameSession, userId) {
    let card = getCard(gameSession);
    gameSession.game.points.players[userId].usedItems.push(card);
    gameSession.game.points.usedItems.push(card);
    return card;
};