const retryBotRequest = require("./retryBotRequest");
const getPhoto = require("../getters/getPhoto");
const savePhotoId = require("../getters/savePhotoId");
const fs = require("fs");

module.exports = function (chatId, path, form) {
    let photoId = getPhoto(path);

    if (photoId) {
        return retryBotRequest(bot => bot.sendPhoto(chatId, photoId, form));
    }

    let imageStream = fs.createReadStream(path);
    return retryBotRequest(bot => bot.sendPhoto(chatId, imageStream, form).then(msg => {
        savePhotoId(path, msg.photo[0].file_id);
    }));
};