import updateUserStats from './updateUserStats.js';
import updateUserStatsInAllChatSessions from './updateUserStatsInAllChatSessions.js';
import updateUserSkillsInAllChatSessions from './updateUserSkillsInAllChatSessions.js';
import addStealChance from './addStealChance.js';
import addBonusChance from './addBonusChance.js';
import clearSessionsInAllChatSessions from './clearSessionsInAllChatSessions.js';
import respawn from './respawn.js';
import clearChatSession from './clearBossSession.js';

export default [
    ...updateUserStats,
    ...updateUserStatsInAllChatSessions,
    ...updateUserSkillsInAllChatSessions,
    ...clearSessionsInAllChatSessions,
    ...addStealChance,
    ...respawn,
    ...clearChatSession,
    ...addBonusChance
];