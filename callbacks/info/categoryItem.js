const dictionary = require('../../dictionaries/main');
const buttonsDictionary = require('../../dictionaries/buttons');
const sendMessage = require('../../functions/sendMessage');
const deleteMessage = require('../../functions/deleteMessage');
const fetchItemByType = require('../../functions/info/fetch/fetchItemByType');

module.exports = [[/^info\.[^.]+\.[^.]+$/, function (session, callback) {
    deleteMessage(callback.message.chat.id, session.messages, callback.message.message_id);
    session.anchorMessageId = callback.message.message_id;
    const [, type, item] = callback.data.match(/^info\.([^.]+)\.([^.]+)$/);

    function messageTemplate (item) {
     let title = `${item.name} ${item.type}\n\n\n`;
     let description = `Description: ${item.description}\n\n`;
     let location = `Location: ${item.location}\n\n`;
     let nation = `Nation: ${item.nation}\n\n`;
     let recommendedElements = `Recommended elements: ${item.recommendedElements.forEach(element => element)}\n\n`;
     let rewards = `Rewards: ${item.rewards.forEach(reward => reward.day + ' ' + reward.details)}`;
        return title + description + location + nation + recommendedElements + rewards;
    }

    function buttonsTemplate (item) {
        let buttons = [];
        let tempArray = [];

        for (let i = 0; i < item.requirements.length; i++) {
            if (i % 3 !== 3) {

            }
        }

        return buttons;
    }

    fetchItemByType(type, item)
        .then(resp => resp.data)
        .then(item =>
            sendMessage(session, callback.message.chat.id, `${messageTemplate(item)}`, {
                reply_markup: [[{
                            text: buttonsDictionary[session.language.buttons].close,
                            callback_data: "category.close"
                        }]]
            }))
        .catch(e => console.error(e));

}], ["info.artifacts.close", function (session, callback) {
    deleteMessage(callback.message.chat.id, session.messages, session.anchorMessageId);
}]];