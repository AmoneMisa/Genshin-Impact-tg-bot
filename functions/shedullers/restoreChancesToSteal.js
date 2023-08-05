const {sessions} = require("../../data");

module.exports = function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            session.game.chanceToSteal = 2;
        }
    }
}