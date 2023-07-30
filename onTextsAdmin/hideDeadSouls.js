const sendMessage = require('../functions/tgBotFunctions/sendMessage');
const hideDeadSouls = require('../functions/misc/hideDeadSouls');
const {myId} = require('../config');

module.exports = [[/(?:^|\s)\/hide_dead_souls\b/, async (msg) => {
    if (msg.from.id !== myId) {
        return;
    }

    await hideDeadSouls();
    await sendMessage(myId, "Мёртвые души отфильтрованы.", {});
}]];
