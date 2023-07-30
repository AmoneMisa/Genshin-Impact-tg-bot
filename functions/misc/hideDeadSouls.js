const data = require("../../data");
const bot = require("../../bot");

module.exports = async function () {
    for (let [chatId, chatSession] of Object.entries(data.sessions)) {
        for (let [userId, session] of Object.entries(chatSession.members)) {
            bot.getChatMember(chatId, parseInt(userId)).then(chatMember => {
                if (chatMember.status === "left" || chatMember.status === "kicked" || chatMember.status === "banned") {
                    session.isHided = true;
                    return;
                }

                if (chatMember && session.isHided) {
                    session.isHided = false;
                } else {
                    session.isHided = false;
                }
            });
        }
    }
}