const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');
const sendMessage = require('../../../functions/sendMessage');
const changePlayerClass = require('../../../functions/game/player/changePlayerClass');
const getPlayerClass = require('../../../functions/game/player/getPlayerClass');

module.exports = [[/^set_class\.[^.]+$/, function (session, callback) {
    const [ , _class] = callback.data.match(/^set_class\.([^.]+)$/);

    if (!callback.message.text.includes(session.userChatData.user.username)) {
        return;
    }

    changePlayerClass(session, _class);
    let {stats} = getPlayerClass(session);
    sendMessage(callback.message.chat.id, `${session.userChatData.user.username}, ты успешно сменил класс на ${stats.translateName}`)
        .then((message) => deleteMessageTimeout(callback.message.chat.id, message.message_id, 10000));
}]];