const getCard = require('./getCard');
const getPoints = require('./getPoints');

module.exports = function (chatSession) {
    while (true) {
       let points = getPoints(chatSession.pointPlayers["bot"]);

       if (points >= 18) {
           chatSession.pointPlayers['bot'].isPass = true;
           break;
       }

        getCard(chatSession, "bot");
    }
};