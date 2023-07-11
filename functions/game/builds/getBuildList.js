const getSession = require('../../getters/getSession');

module.exports = async function (chatId, userId) {
    const session = await getSession(chatId, userId);

    return session.game.builds;
};