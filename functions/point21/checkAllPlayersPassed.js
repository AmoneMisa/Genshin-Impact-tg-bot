module.exports = function (chatSession) {
    let players = Object.values(chatSession.pointPlayers);
    let passedPlayers = players.filter(player => player.isPass);
    return players.length === passedPlayers.length;
};