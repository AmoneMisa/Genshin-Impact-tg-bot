const cardsDictionary = require('../../dictionaries/pointCards');

function getCardPoints(card, points) {
    for (let _card of cardsDictionary.values) {
        if (card.startsWith(_card.name)) {
            if (card.startsWith('Т') && points + _card.point > 21) {
                return 1;
            }

            return _card.point;
        }
    }

    return 0;
}

module.exports = function (player) {
    let points = 0;

    for (let card of player.cards) {
        if (!card.startsWith('Т')) {
            let cardPoints = getCardPoints(card, points);
            points += cardPoints;
        }
    }

    for (let card of player.cards) {
        if (card.startsWith('Т')) {
            let cardPoints = getCardPoints(card, points);
            points += cardPoints;
        }
    }

    return points;
};