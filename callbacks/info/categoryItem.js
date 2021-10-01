const buttonsDictionary = require('../../dictionaries/buttons');
const sendMessage = require('../../functions/sendMessage');
const deleteMessage = require('../../functions/deleteMessage');
const fetchItemByType = require('../../functions/info/fetch/fetchItemByType');
const formatMessageArtifactItem = require('../../functions/info/formats/formatMessageArtifactItem');
const formatMessageDomainItem = require('../../functions/info/formats/formatMessageDomainItem');

module.exports = [[/^info\.[^.]+\.[^.]+$/, function (session, callback) {
    deleteMessage(callback.message.chat.id, session.messages, callback.message.message_id);
    session.anchorMessageId = callback.message.message_id;
    const [, type, item] = callback.data.match(/^info\.([^.]+)\.([^.]+)$/);

    function messageTemplate(item) {
        if (item.name === "artifacts") {
            console.log(item);
            formatMessageArtifactItem(item);
        }

        if (item.name === "characters") {

        }

        if (item.name === "consumables") {

        }

        if (item.name === "domains") {
            formatMessageDomainItem(item);
        }

        if (item.name === "elements") {
        }

        if (item.name === "enemies") {
            formatMessageArtifactItem(item);
        }

        if (item.name === "materials") {
            formatMessageArtifactItem(item);
        }

        if (item.name === "nations") {
            formatMessageArtifactItem(item);
        }

        if (item.name === "weapons") {
            formatMessageArtifactItem(item);
        }
    }

    function buttonsTemplate(type, item) {
        let buttons = [];
        let tempArray = null;
        if (item.requirements) {
            for (let i = 0; i < item.requirements.length; i++) {
                if (i % 3 === 0) {
                    tempArray = [];
                    buttons.push(tempArray);
                }
                tempArray.push(buttonTemplate(type, item.type, item.requirements[i]));
            }
        }
        return buttons;
    }

    function buttonTemplate(type, item, button) {
        return {text: `Lvl req. ${button.level}`, callback_data: `info.${type}.${item}.button-${button.level}`}
    }

    fetchItemByType(type, item)
        .then(resp => resp.data)
        .then(item => {
                if (!item.hasOwnProperty("name")) {
                    return;
                }

                let buttons = buttonsTemplate(type, item);
                let buttonClose = [{
                    text: buttonsDictionary[session.language.buttons].close,
                    callback_data: "info.close"
                }];
                sendMessage(session, callback.message.chat.id, `${messageTemplate(item)}`, {
                    reply_markup: {
                        inline_keyboard: [...buttons, buttonClose]
                    }
                })
            }
        )
        .catch(e => console.error(e));
}]];