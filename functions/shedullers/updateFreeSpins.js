const {sessions} = require("../../data");
const gachaTemplate = require("../../templates/gachaTemplate");

module.exports = function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            for (let value of gachaTemplate) {
                session.game.gacha[value.name] = value.freeSpins;
            }
        }
    }
}