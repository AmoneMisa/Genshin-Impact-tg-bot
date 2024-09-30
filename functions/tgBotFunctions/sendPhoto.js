import retryBotRequest from './retryBotRequest.js';
import getPhoto from '../getters/getPhoto.js';
import savePhotoId from '../getters/savePhotoId.js';
import fs from 'fs';

export default function (chatId, path, form) {
    let photoId = getPhoto(path);

    if (photoId) {
        return retryBotRequest(bot => bot.sendPhoto(chatId, photoId, form));
    }

    let imageStream = fs.createReadStream(path);
    return retryBotRequest(bot => bot.sendPhoto(chatId, imageStream, form).then(msg => {
        savePhotoId(path, msg.photo[0].file_id);
    }));
};