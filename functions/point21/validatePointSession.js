module.exports = function (chatSession, userId) {
    if (!chatSession.pointIsStart) {
        return false;
    }

    if (!chatSession.pointPlayers[userId]) {
        return false;
    }

    return !chatSession.pointPlayers[userId].isPass;
};