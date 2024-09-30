import { sessions } from '../../data.js';
import gachaTemplate from '../../template/gachaTemplate.js';

export default function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            for (let value of gachaTemplate) {
                session.game.gacha[value.name] = value.freeSpins;
            }
        }
    }
}