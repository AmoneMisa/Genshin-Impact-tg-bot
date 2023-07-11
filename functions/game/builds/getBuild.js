import getSession from '../../getters/getSession';

module.exports = async function (chatId, userId, buildName) {
    const session = await getSession(chatId, userId);

    return session.game.builds[buildName];
};