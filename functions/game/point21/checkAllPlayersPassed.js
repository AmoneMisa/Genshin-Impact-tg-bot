module.exports = function (chatSession) {
    let players = Object.entries(chatSession.pointPlayers);
    let passedPlayers = players.filter(([playerId, player]) => playerId === "bot" || player.isPass);
    return players.length === passedPlayers.length;
};