import { fromPath } from 'node-telegram-bot-api/node';
import retryBotRequest from './retryBotRequest.js';
import getPhoto from '../getters/getPhoto.js';
import savePhotoId from '../getters/savePhotoId.js';

export default async function (path, caption, form) {
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
        let photoFile = await fromPath(path);
        return retryBotRequest(bot => bot.editMessageMedia({
            type: "photo",
            media: photoFile,
            caption: caption
        }, form)).then(msg => savePhotoId(path, msg.photo[0].file_id));
    }
};