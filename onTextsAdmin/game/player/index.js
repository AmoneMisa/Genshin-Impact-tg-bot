const updateUserStats = require('./updateUserStats');
const updateUserStatsInAllChatSessions = require('./updateUserStatsInAllChatSessions');
const updateUserSkillsInAllChatSessions = require('./updateUserSkillsInAllChatSessions');
const addStealChance = require('./addStealChance');
const clearSessionsInAllChatSessions = require('./clearSessionsInAllChatSessions');

module.exports = [
    ...updateUserStats,
    ...updateUserStatsInAllChatSessions,
    ...updateUserSkillsInAllChatSessions,
    ...clearSessionsInAllChatSessions,
    ...addStealChance
];