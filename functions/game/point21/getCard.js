import getRandom from '../../getters/getRandom.js';
import cardsDictionary from '../../../dictionaries/pointCards.js';

function getCard(game) {
    if (game.usedItems.length === 36) {
        return null;
    }

    while (true) {
        let cards = `${cardsDictionary.values[getRandom(0, cardsDictionary.values.length - 1)].name} ${cardsDictionary.suits[getRandom(0, cardsDictionary.suits.length - 1)]}`;

        if (!game.usedItems.includes(cards)) {
            return cards;
        }
    }
}

export default function (game, userId) {
    let card = getCard(game);
    game.players[userId].usedItems.push(card);
    game.usedItems.push(card);
    return card;
};