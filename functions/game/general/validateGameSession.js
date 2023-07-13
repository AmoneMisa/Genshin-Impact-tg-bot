module.exports = function (chatSession, userId, gameName) {
    if (!chatSession.game[gameName].isStart) {
        return false;
    }

    if (!chatSession.game[gameName].players[userId]) {
        return false;
    }

    if (gameName !== "elements") {
        return !chatSession.game[gameName].players[userId].isPass;
    }
};