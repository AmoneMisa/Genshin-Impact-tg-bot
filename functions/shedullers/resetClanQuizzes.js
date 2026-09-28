import Clan from "../../db/models/Clan.js";
import clanQuiz from "../../dictionaries/clanQuiz.js";

/**
 * Daily clan quiz rotation.
 *
 * For every clan it picks a fresh question from the pool, wipes yesterday's
 * participants and stamps the reset time. Run once a day from evenDay.js.
 * The clan.quiz sub-path is Mixed, so the Clan pre-save hook persists it.
 */
export default async function () {
    if (!clanQuiz.length) {
        return;
    }

    const clans = await Clan.find({});

    for (const clan of clans) {
        const previousIndex = clan.quiz?.questionIndex ?? -1;

        // Pick a different question than yesterday when more than one exists.
        let nextIndex = Math.floor(Math.random() * clanQuiz.length);
        if (clanQuiz.length > 1 && nextIndex === previousIndex) {
            nextIndex = (nextIndex + 1) % clanQuiz.length;
        }

        clan.quiz = {
            lastResetAt: Date.now(),
            questionIndex: nextIndex,
            participants: {}
        };

        await clan.save();
    }
}
