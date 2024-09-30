import { sessions } from '../../data.js';

export default function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            session.game.arenaChances = 15;
            session.game.arenaExpansionChances = 10;
        }
    }
}