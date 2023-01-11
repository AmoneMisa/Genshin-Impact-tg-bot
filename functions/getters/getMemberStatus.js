const getMembers = require('./getMembers');

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

    return msgId === 86416302;
}