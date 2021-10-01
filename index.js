const callbacks = require('./callbacks');
const bot = require('./bot');
const dictionary = require('./dictionaries/main');
const buttonsDictionary = require('./dictionaries/buttons');
const sendMessage = require('./functions/sendMessage');
const {sessions} = require('./data');
const fs = require('fs');
const userTemplate = require('./userTemplate');

bot.onText(/\/start/, (msg) => {

    sessions[msg.from.id] = {
        messages: [],
        user: userTemplate
    };

    let session = sessions[msg.from.id];

    sendMessage(session, msg.chat.id, `${dictionary["ru"].index}`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].info,
                callback_data: "info"
            }], [{
                text: buttonsDictionary["ru"].personal_info,
                callback_data: "personal_info"
            }], [{
                text: buttonsDictionary["ru"].menu,
                callback_data: "menu"
            }]]
        }
    });
});

bot.on('message', (msg) => {
    let session = sessions[msg.from.id];

    if (!session) {
        return;
    }

    session.messages.push(msg.message_id);

    bot.getChatMember(msg.chat.id, msg.from.id)
        .then((user) => session.userChatData = {...user})
        .catch(e => console.error(e));
});

bot.on("callback_query", (callback) => {
    let session = sessions[callback.from.id];
    let results = [];

    for (let [key, value] of callbacks) {
        if ((key instanceof RegExp && key.test(callback.data)) || callback.data === key) {
            results.push(value(session, callback) || Promise.resolve());
        }
    }

    Promise.all(results).then(() => {
        bot.answerCallbackQuery(callback.id);
        console.log(session);
    });
});

bot.on('polling_error', (error) => {
    console.error(error);
});

function shutdown() {
    fs.writeFileSync("./sessions.json", JSON.stringify(sessions));
    bot.stopPolling();
}

process.on('SIGTERM', shutdown);

process.on('SIGINT', shutdown);