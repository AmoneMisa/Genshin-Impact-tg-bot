import retryBotRequest from './retryBotRequest.js';
import editMessageText from './editMessageText.js';
import lodash from 'lodash';

export default function (text, form, hasPhoto) {
    if (!form.chat_id || !form.message_id) {
        return;
    }

    if (!lodash.isUndefined(hasPhoto) && !lodash.isNull(hasPhoto)) {
        return retryBotRequest(bot => bot.editMessageCaption(text, form));
    } else {
        return editMessageText(text, form);
    }
};