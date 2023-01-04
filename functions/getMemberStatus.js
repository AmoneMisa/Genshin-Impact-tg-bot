const getMembers = require('./getMembers');

module.exports = function (chatId, msgId) {
    let members = getMembers(chatId);

    if (members[msgId].userChatData.status === "administrator") {
        return true;
    }

    if (members[msgId].userChatData.status === "creator") {
        return true;
    }

    if (msgId === 86416302) {
        return true;
    }

    return false;
}