const getCard = require('./getCard');
const getPoints = require('./getPoints');

module.exports = function (chatSession) {
    let players = Object.entries(chatSession.pointPlayers)
        .filter(([playerId,]) => playerId !== "bot")
        .map(([, player]) => player);
    let points = players.map(player => getPoints(player)).filter(points => points <= 21);
    let maxPoints = Math.max.apply(null, points) || 0;

    while (true) {
       let points = getPoints(chatSession.pointPlayers["bot"]);

       if (points === 21 || points > maxPoints) {
           chatSession.pointPlayers['bot'].isPass = true;
           break;
       }

        getCard(chatSession, "bot");
    }
};