import getSession from '../../getters/getSession';

module.exports = async function (chatId, userId) {
    const session = await getSession(chatId, userId);

    return Array.from(Object.entries(session.game.builds));
};