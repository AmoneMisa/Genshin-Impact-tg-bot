module.exports = function (chatSession) {
    return !!Array.from(Object.values(chatSession.game)).find(game => game.gameSessionIsStart);
}