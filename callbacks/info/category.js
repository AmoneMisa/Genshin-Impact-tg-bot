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
        .then(items => {
            function buttonsTemplate() {
                let buttons = [];
                let tempArray = null;
                if (items) {
                    for (let i = 0; i < items.length; i++) {
                        if (i % 3 === 0) {
                            tempArray = [];
                            buttons.push(tempArray);
                        }
                        tempArray.push({text: items[i].toUpperCase(), callback_data: `info.${type}.${items[i]}`});
                    }
                }
                return buttons;
            }

            let buttons = buttonsTemplate();
            let buttonClose = [{
                text: buttonsDictionary[session.language.buttons].close,
                callback_data: "info.close"
            }];
            sendMessage(session, callback.message.chat.id, `${dictionary[session.language.text].info.type}`, {
                reply_markup: {
                    inline_keyboard: [...buttons, buttonClose]
                }
            })
        })
        .catch(e => console.error(e));
}]];