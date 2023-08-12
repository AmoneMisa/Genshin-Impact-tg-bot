const retryBotRequest = require("./retryBotRequest");
const editMessageText = require("./editMessageText");
const lodash = require("lodash");

module.exports = function (text, form, hasPhoto) {
    if (!form.chat_id || !form.message_id) {
        return;
    }

    if (!lodash.isUndefined(hasPhoto) && !lodash.isNull(hasPhoto)) {
        return retryBotRequest(bot => bot.editMessageCaption(text, form));
    } else {
        return editMessageText(text, form);
    }
};