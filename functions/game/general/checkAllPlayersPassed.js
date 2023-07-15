module.exports = function (chatSession, gameName) {
    let players = Object.entries(chatSession.game[gameName].players);
    let passedPlayers = players.filter(([playerId, player]) => playerId === "bot" || player.isPass);
    return players.length === passedPlayers.length;
};