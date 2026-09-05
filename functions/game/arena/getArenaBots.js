import ArenaTempBot from "../../../db/models/ArenaTempBot.js";

const maxRatingDifference = 60; // В очках

export default async function(rating) {
    // Загружаем всех ботов из базы
    const bots = await ArenaTempBot.find();

    return bots.filter(arenaBot => {
        if (arenaBot.rating === 1000) {
            return true;
        }
        return arenaBot.rating >= rating &&
            arenaBot.rating - rating <= Math.max(0, maxRatingDifference);
    });
}
