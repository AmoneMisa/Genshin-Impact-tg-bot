const getMembers = require('./getMembers');
const {myId} = require("../../config");

module.exports = function (chatId, msgId) {
    let members = getMembers(chatId);

    if (members[msgId]) {
        if (members[msgId].userChatData.status === "administrator") {
            return true;
        }

        if (members[msgId].userChatData.status === "creator") {
            return true;
        }
    }

    return msgId === myId;
}