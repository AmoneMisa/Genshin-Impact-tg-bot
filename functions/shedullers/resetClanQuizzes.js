import Clan from "../../db/models/Clan.js";
import clanQuiz from "../../dictionaries/clanQuiz.js";

/**
 * Daily clan quiz rotation.
 *
 * For every clan it picks a fresh question from the pool, wipes yesterday's
 * participants and stamps the reset time. Run once a day from evenDay.js.
 * Written with one bulkWrite, so the Clan pre-save hook is not involved.
 */
export default async function () {
    if (!clanQuiz.length) {
        return;
    }

    const clans = await Clan.find({}, { _id: 1, 'quiz.questionIndex': 1 }).lean();
    const now = Date.now();

    const operations = clans.map(clan => {
        const previousIndex = clan.quiz?.questionIndex ?? -1;

        // Pick a different question than yesterday when more than one exists.
        let nextIndex = Math.floor(Math.random() * clanQuiz.length);
        if (clanQuiz.length > 1 && nextIndex === previousIndex) {
            nextIndex = (nextIndex + 1) % clanQuiz.length;
        }

        return {
            updateOne: {
                filter: { _id: clan._id },
                update: { $set: { quiz: { lastResetAt: now, questionIndex: nextIndex, participants: {} } } }
            }
        };
    });

    if (operations.length) await Clan.bulkWrite(operations, { ordered: false });
}
