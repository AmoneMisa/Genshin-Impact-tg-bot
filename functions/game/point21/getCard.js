import getRandom from "../../getters/getRandom.js";
import cardsDictionary from "../../../dictionaries/pointCards.js";

function getCard(game) {
    const totalCards = cardsDictionary.values.length * cardsDictionary.suits.length;

    if (game.usedItems.length >= totalCards) {
        return null; // все карты уже использованы
    }

    let attempts = 0;
    while (attempts < 100) { // ограничение на попытки
        const value = cardsDictionary.values[getRandom(0, cardsDictionary.values.length - 1)].name;
        const suit = cardsDictionary.suits[getRandom(0, cardsDictionary.suits.length - 1)];
        const card = `${value} ${suit}`;

        if (!game.usedItems.includes(card)) {
            return card;
        }
        attempts++;
    }

    return null; // если вдруг не нашли свободную карту
}

export default function giveCard(game, userId) {
    if (!game.players[userId]) {
        throw new Error(`Игрок ${userId} не найден`);
    }

    const card = getCard(game);
    if (!card) return null;

    game.players[userId].usedItems.push(card);
    game.usedItems.push(card);

    return card;
}
