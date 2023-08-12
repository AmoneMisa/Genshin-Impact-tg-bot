const getMembers = require('./getMembers');
const {myId} = require("../../config");

module.exports = function (chatId, userId) {
    let members = getMembers(chatId);

    if (members[userId]) {
        if (members[userId].userChatData.status === "administrator") {
            return true;
        }

        if (members[userId].userChatData.status === "creator") {
            return true;
        }
    }

    return userId === myId;
}