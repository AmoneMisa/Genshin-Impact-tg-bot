import { sessions } from '../../data.js';

export default async function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            if (new Date().getTime() < session.game.inventory.arena.pvpSign.lifeTime) {
                continue;
            }

            session.game.inventory.arena.pvpSign = null;
        }
    }
}