const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const data = require("../../../data");
const {myId} = require("../../../config");
const lodash = require("lodash");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");

module.exports = module.exports = [[/(?:^|\s)\/clear_titles/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    for (let titleList of Object.values(data.titles)) {
        lodash.remove(titleList, lodash.isObject);
    }

    await sendMessage(msg.from.id, "Титулы очищены", {
        disable_notification: true
    });
}]];