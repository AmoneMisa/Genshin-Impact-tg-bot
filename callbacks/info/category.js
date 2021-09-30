const dictionary = require('../../dictionaries/main');
const buttonsDictionary = require('../../dictionaries/buttons');
const sendMessage = require('../../functions/sendMessage');
const deleteMessage = require('../../functions/deleteMessage');
const fetchCategoryByType = require('../../functions/info/fetch/fetchCategoryByType');

module.exports = [[/^info\.[^.]+$/, function (session, callback) {
    deleteMessage(callback.message.chat.id, session.messages, callback.message.message_id);
    session.anchorMessageId = callback.message.message_id;
    const [, type] = callback.data.match(/^info\.([^.]+)$/);

    fetchCategoryByType(type)
        .then(resp => resp.data)
        .then(items =>
            sendMessage(session, callback.message.chat.id, `${dictionary[session.language.text].info.type}`, {
                reply_markup: {
                    inline_keyboard: [
                        items.map(item => ({
                            text: item.toUpperCase(),
                            callback_data: `info.${type}.${item}`
                        })),
                        [{
                            text: buttonsDictionary[session.language.buttons].close,
                            callback_data: "category.close"
                        }]]
                }
            }))
        .catch(e => console.error(e));

}], ["info.artifacts.close", function (session, callback) {
    deleteMessage(callback.message.chat.id, session.messages, session.anchorMessageId);
}]];