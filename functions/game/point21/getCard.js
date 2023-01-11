const getRandom = require('../../getters/getRandom');
const cardsDictionary = require('../../../dictionaries/pointCards');

function getCard(gameSession) {
    if (gameSession.pointUsedCards.length === 36) {
        return null;
    }

    while (true) {
        let cards = `${cardsDictionary.values[getRandom(0, cardsDictionary.values.length - 1)].name} ${cardsDictionary.suits[getRandom(0, cardsDictionary.suits.length - 1)]}`;

        if (!gameSession.pointUsedCards.includes(cards)) {
            return cards;
        }
    }
}

module.exports = function (gameSession, userId) {
    let card = getCard(gameSession);

    gameSession.pointPlayers[userId].cards.push(card);
    gameSession.pointUsedCards.push(card);
    return card;
};