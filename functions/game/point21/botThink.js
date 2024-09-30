import getCard from './getCard.js';
import getPoints from './getPoints.js';

export default function (chatSession) {
    let players = Object.entries(chatSession.game.points.players)
        .filter(([playerId,]) => playerId !== "bot")
        .map(([, player]) => player);
    let points = players.map(player => getPoints(player)).filter(points => points <= 21);
    let maxPoints = Math.max.apply(null, points) || 0;

    while (true) {
       let points = getPoints(chatSession.game.points.players["bot"]);

       if (points === 21 || points > maxPoints) {
           chatSession.game.points.players['bot'].isPass = true;
           break;
       }

        getCard(chatSession.game.points, "bot");
    }
};