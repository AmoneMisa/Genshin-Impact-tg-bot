const retryBotRequest = require("./retryBotRequest");

module.exports = function (media, form) {
    if (!form.chat_id || !form.message_id) {
        return;
    }

    if (media) {
        return retryBotRequest(bot => bot.editMessageMedia(media, form));
    }
};