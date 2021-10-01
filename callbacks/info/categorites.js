const dictionary = require('../../dictionaries/main');
const buttonsDictionary = require('../../dictionaries/buttons');
const sendMessage = require('../../functions/sendMessage');
const deleteMessage = require('../../functions/deleteMessage');
const axios = require('axios');
const {apiHost} = require('./../../config');

module.exports = [["info", function (session, callback) {
    deleteMessage(callback.message.chat.id, session.messages, callback.message.message_id);
    session.anchorMessageId = callback.message.message_id;

    (async function () {
        return await axios.get(`${apiHost}`)
            .then(resp => resp.data)
            .then(({types}) => {
                function buttonsTemplate() {
                    let buttons = [];
                    let tempArray = null;
                    if (types) {
                        for (let i = 0; i < types.length; i++) {
                            if (i % 3 === 0) {
                                tempArray = [];
                                buttons.push(tempArray);
                            }
                            tempArray.push({text: types[i].toUpperCase(), callback_data: `info.${types[i]}`});
                        }
                    }
                    return buttons;
                }

                let buttons = buttonsTemplate();
                let buttonClose = [{
                    text: buttonsDictionary[session.language.buttons].close,
                    callback_data: "info.close"
                }];

                sendMessage(session, callback.message.chat.id, `${dictionary[session.language.text].info.category}`, {
                    reply_markup: {
                        inline_keyboard: [...buttons, buttonClose]
                    }
                })
            })
            .catch(e => console.error(e));
    })()
}], ["info.close", function (session, callback) {
    deleteMessage(callback.message.chat.id, session.messages, session.anchorMessageId);
}]];