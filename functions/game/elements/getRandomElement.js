import elementsTemplate from '../../../template/elements.js';
import getRandom from '../../getters/getRandom.js';

function pickRandom() {
    return elementsTemplate[getRandom(0, elementsTemplate.length - 1)];
}

function getElement(game) {
    game.usedItems = Array.isArray(game.usedItems) ? game.usedItems : [];
    game.currentRound = Number(game.currentRound) || 1;

    // The old implementation intended the first round to avoid duplicate
    // table draws but accidentally read chat.currentRound/chat.elements.
    // Keep that rule while there are unused elements; after all seven are
    // exhausted, fall back to normal random draws instead of looping forever.
    if (game.currentRound === 1) {
        const available = elementsTemplate.filter(element => !game.usedItems.includes(element));
        if (available.length) {
            const element = available[getRandom(0, available.length - 1)];
            game.usedItems.push(element);
            return element;
        }
    }

    return pickRandom();
}

export default function (chatSession, userId) {
    const game = chatSession?.game?.elements;
    if (!game?.players?.[userId]) {
        throw new Error(`Elements player ${userId} not found`);
    }

    const element = getElement(game);
    game.players[userId].usedItems = Array.isArray(game.players[userId].usedItems)
        ? game.players[userId].usedItems
        : [];
    game.players[userId].usedItems.push(element);
    return element;
}
