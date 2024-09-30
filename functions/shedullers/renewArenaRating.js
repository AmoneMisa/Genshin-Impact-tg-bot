import { arenaRating } from '../../data.js';

export default function () {
    for (let ratingKey of Object.keys(arenaRating.expansion)) {
        arenaRating.expansion[ratingKey] = 1000;
    }

    for (let chatRating of Object.values(arenaRating.common)) {
        for (let ratingKey of Object.keys(chatRating)) {
            chatRating[ratingKey] = 1000;
        }
    }
}