const bot = require('../bot');
const {myId} = require('../config');
const fs = require('fs');
const deleteMessage = require("../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/get_debug_log\b/, async (msg) => {
    if (msg.from.id !== myId) {
        return;
    }

    await deleteMessage(msg.chat.id, msg.message_id);
    let document = fs.createReadStream('./api.access.log');
    let year = new Date().getFullYear();
    let month = new Date().getMonth();
    let day = new Date().getDate();
    let hours = new Date().getHours();
    let minutes = new Date().getMinutes();
    let seconds = new Date().getSeconds();

    await bot.sendDocument(myId, document, {
        caption: `Лог бота от: ${day}.${month}.${year} - ${hours}:${minutes}:${seconds}`
    });
}]];