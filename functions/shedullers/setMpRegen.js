import { sessions } from '../../data.js';
import getMaxMp from '../game/player/getters/getMaxMp.js';
import getCurrentMp from '../game/player/getters/getCurrentMp.js';

export default function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            let mpRegenSpeed = session.game.gameClass.stats.mpRestoreSpeed;
            if (getCurrentMp(session) > getMaxMp(session)) {
                session.game.gameClass.stats.mp = getMaxMp(session);
                continue;
            }

            if (getCurrentMp(session) === getMaxMp(session)) {
                continue;
            }

            session.game.gameClass.stats.mp = Math.min(getMaxMp(session), getCurrentMp(session) + mpRegenSpeed);
        }
    }
}