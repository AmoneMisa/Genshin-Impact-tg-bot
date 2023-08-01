const retryBotRequest = require("./retryBotRequest");
const getPhoto = require("../getters/getPhoto");
const savePhotoId = require("../getters/savePhotoId");

module.exports = function (path, caption, form) {
    form = form || {};

    if (!form.chat_id || !form.message_id) {
        return;
    }

    let photoId = getPhoto(path);

    if (photoId) {
        return retryBotRequest(bot => bot.editMessageMedia({
            type: "photo",
            media: photoId,
            caption: caption
        }, form));
    }

    if (path) {
        return retryBotRequest(bot => bot.editMessageMedia({
            type: "photo",
            media: `attach://${path}`,
            caption: caption
        }, form)).then(msg => savePhotoId(path, msg.photo[0].file_id));
    }
};