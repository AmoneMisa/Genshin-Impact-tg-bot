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
                sendMessage(session, callback.message.chat.id, `${dictionary[session.language.text].info.category}`, {
                    reply_markup: {
                        inline_keyboard: [
                            types.map(type => ({
                            text: type.toUpperCase(), callback_data: `info.${type}`
                        })), [{
                            text: buttonsDictionary[session.language.buttons].close,
                            callback_data: "info.close"
                        }]]
                    }
                })
            })
            .catch(e => console.error(e));
    })()
}], ["info.close", function (session, callback) {
    deleteMessage(callback.message.chat.id, session.messages, session.anchorMessageId);
}]];