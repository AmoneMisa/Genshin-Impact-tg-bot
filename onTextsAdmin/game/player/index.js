const updateUserStats = require('./updateUserStats');
const updateUserStatsInAllChatSessions = require('./updateUserStatsInAllChatSessions');
const updateUserSkillsInAllChatSessions = require('./updateUserSkillsInAllChatSessions');

module.exports = [...updateUserStats, ...updateUserStatsInAllChatSessions, ...updateUserSkillsInAllChatSessions];