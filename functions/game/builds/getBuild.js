const getBuildList = require('./getBuildList');

module.exports = async function (chatId, userId, buildName) {
    return (await getBuildList(chatId, userId))[buildName];
};