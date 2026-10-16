import Clan from "../../db/models/Clan.js";

/**
 * Daily clan task checklist reset.
 *
 * For every clan, wipes yesterday's per-member progress/claims and stamps the
 * reset time. Run once a day from evenDay.js, mirroring resetClanQuizzes.js.
 * Written with a single updateMany, so the Clan pre-save hook is not involved.
 */
export default async function () {
    // One update instead of loading and saving every clan; the per-clan values are identical.
    await Clan.updateMany({}, {
        $set: {
            tasks: { lastResetAt: Date.now(), progress: {}, claimed: {} }
        }
    });
}
