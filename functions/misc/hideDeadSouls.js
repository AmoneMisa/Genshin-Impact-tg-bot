const {sessions} = require("../../data");
const bot = require("../../bot");

module.exports = async function () {
    for (let [chatId, chatSession] of Object.entries(sessions)) {
        for (let [userId, session] of Object.entries(chatSession.members)) {
            let chatMember = await bot.getChatMember(chatId, parseInt(userId));
            if (!chatMember) {
                session.isHided = true;
            }

            if (chatMember && session.isHided) {
                session.isHided = false;
            }

            session.isHided = false;
        }
    }
}