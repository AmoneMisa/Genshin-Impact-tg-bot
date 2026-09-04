import Clan from "../../db/models/Clan.js";

/**
 * Daily clan task checklist reset.
 *
 * For every clan, wipes yesterday's per-member progress/claims and stamps the
 * reset time. Run once a day from evenDay.js, mirroring resetClanQuizzes.js.
 * The clan.tasks sub-path is Mixed, so the Clan pre-save hook persists it.
 */
export default async function () {
    const clans = await Clan.find({});

    for (const clan of clans) {
        clan.tasks = {
            lastResetAt: Date.now(),
            progress: {},
            claimed: {}
        };

        await clan.save();
    }
}
