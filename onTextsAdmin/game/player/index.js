const updateUserStats = require('./updateUserStats');
const updateUserStatsInAllChatSessions = require('./updateUserStatsInAllChatSessions');
const updateUserSkillsInAllChatSessions = require('./updateUserSkillsInAllChatSessions');
const addStealChance = require('./addStealChance');
const addBonusChance = require('./addBonusChance');
const clearSessionsInAllChatSessions = require('./clearSessionsInAllChatSessions');
const respawn = require('./respawn');
const clearChatSession = require('./clearBossSession');

module.exports = [
    ...updateUserStats,
    ...updateUserStatsInAllChatSessions,
    ...updateUserSkillsInAllChatSessions,
    ...clearSessionsInAllChatSessions,
    ...addStealChance,
    ...respawn,
    ...clearChatSession,
    ...addBonusChance
];