import cardsDictionary from '../../../dictionaries/pointCards.js';

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

export default function (player) {
    if (!player) {
        return ;
    }

    if (!player.usedItems) {
        return ;
    }

    let points = 0;

    for (let card of player.usedItems) {
        if (!card.startsWith('Т')) {
            let cardPoints = getCardPoints(card, points);
            points += cardPoints;
        }
    }

    for (let card of player.usedItems) {
        if (card.startsWith('Т')) {
            let cardPoints = getCardPoints(card, points);
            points += cardPoints;
        }
    }

    return points;
};