const updateUserStats = require('./updateUserStats');
const updateUserStatsInAllChatSessions = require('./updateUserStatsInAllChatSessions');

module.exports = [...updateUserStats, ...updateUserStatsInAllChatSessions];