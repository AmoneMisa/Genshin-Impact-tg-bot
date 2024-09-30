import getSession from '../../getters/getSession.js';

export default async function (chatId, userId) {
    const session = await getSession(chatId, userId);
    return session.game.builds;
};