const retryBotRequest = require("./retryBotRequest");

module.exports = function (text, form) {
    if (!form.chat_id || !form.message_id) {
        return;
    }

    return retryBotRequest(bot => bot.editMessageText(text, form));
};