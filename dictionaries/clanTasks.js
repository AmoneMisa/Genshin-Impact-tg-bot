/**
 * Daily clan task checklist — separate from the daily quiz (dictionaries/clanQuiz.js).
 *
 * Each task tracks a boolean "done today" flag per member (clan.tasks.progress),
 * marked by the activity handler itself (see callbacks/game/clan/clanCallback.js).
 * Rewards go to the player's personal inventory + a small clan-contribution bump,
 * mirroring the quiz reward shape. Reset once a day by resetClanTasks.js.
 */
const clanTasks = [
    { key: "contribute", label: "Внести вклад в хранилище клана", goldReward: 80, contributionReward: 5 },
    { key: "bossAttack", label: "Атаковать кланового босса", goldReward: 80, contributionReward: 5 },
    { key: "duelWin", label: "Победить в дружеской дуэли", goldReward: 100, contributionReward: 5 },
    { key: "quizAnswer", label: "Ответить на клановую викторину", goldReward: 60, contributionReward: 5 }
];

// Bonus clan XP granted once per day per member who claims every task above.
export const CLAN_TASKS_BONUS_XP = 50;

export default clanTasks;
