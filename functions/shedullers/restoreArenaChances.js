const {sessions} = require("../../data");

module.exports = function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            session.game.arenaChances = Math.max(15, session.game.arenaChances + 1);
            session.game.arenaExpansionChances = Math.max(10, session.game.arenaExpansionChances + 1);
        }
    }
}