const retryBotRequest = require("./retryBotRequest");
const editMessageText = require("./editMessageText");

module.exports = function (text, form, hasPhoto) {
    if (!form.chat_id || !form.message_id) {
        return;
    }

    if (hasPhoto) {
        return retryBotRequest(bot => bot.editMessageCaption(text, form));
    } else {
        return editMessageText(text, form);
    }
};