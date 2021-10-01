const callbacks = require('./callbacks');
const bot = require('./bot');
const dictionary = require('./dictionaries/main');
const buttonsDictionary = require('./dictionaries/buttons');
const sendMessage = require('./functions/sendMessage');
let {sessions, users, chatId} = require('./data');
const fs = require('fs');
const userTemplate = require('userTemplate');

try {
    let sessionsJson = fs.readFileSync("./sessions.json");
    sessions = JSON.parse(sessionsJson);
} catch (e) {
    sessions = {};
}

bot.onText(/\/start/, (msg) => {

    sessions[msg.chat.id] = {
        messages: []
    };

    users[msg.from.id] = userTemplate;

    let session = sessions[msg.chat.id];

    sendMessage(session, msg.chat.id, `${dictionary["ru"].index}`, {
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary[session.language.buttons].info,
                callback_data: "info"
            }], [{
                text: buttonsDictionary[session.language.buttons].menu,
                callback_data: "menu"
            }]]
        }
    });
});

bot.on('message', (msg) => {
    let session = sessions[msg.chat.id];

    if (!session) {
        return;
    }

    session.messages.push(msg.message_id);

    bot.getChatMember(msg.chat.id, msg.from.id)
        .then(user => users[msg.from.id] = {
            ...user,
            is_show_message_to_all: users[msg.from.id].is_show_message_to_all || false,
            session: session
        });
    console.log(session);
});

bot.on("callback_query", (callback) => {
    let session = sessions[callback.message.chat.id];
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
//
// function shutdown() {
//     fs.writeFileSync("./sessions.json", JSON.stringify(sessions));
//     bot.stopPolling();
// }
//
// process.on('SIGTERM', shutdown);
//
// process.on('SIGINT', shutdown);