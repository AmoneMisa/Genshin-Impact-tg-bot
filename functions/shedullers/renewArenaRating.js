import ArenaRating from "../../db/models/ArenaRating.js";

/**
 * Сбрасывает все значения рейтингов до 1000 в базе
 */
export default async function resetArenaRatings() {
    // Сбрасываем expansion
    await ArenaRating.updateMany(
        { type: "expansion" },
        { $set: { value: 1000 } }
    );

    // Сбрасываем common
    await ArenaRating.updateMany(
        { type: "common" },
        { $set: { value: 1000 } }
    );
}
