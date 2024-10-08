import elementsTemplate from '../../../template/elements.js';
import getRandom from '../../getters/getRandom.js';

function getElement(gameSession) {
    if (gameSession.currentRound === 1) {
        while (true) {
            let element = elementsTemplate[getRandom(0, Object.keys(elementsTemplate).length - 1)];

            if (!gameSession.elements.usedItems.includes(element)) {
                gameSession.elements.usedItems.push(element);
                return element;
            }
        }
    }

    return elementsTemplate[getRandom(0, Object.keys(elementsTemplate).length - 1)];
}

export default function (gameSession, userId) {
    let players = gameSession.game.elements.players;
    let element = getElement(gameSession);

    players[userId].usedItems.push(element);
    return element;
};