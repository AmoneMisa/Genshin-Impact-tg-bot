import { sessions } from '../../data.js';
import isPlayerInFight from '../game/player/isPlayerInFight.js';
import getMaxCp from '../game/player/getters/getMaxCp.js';
import getCurrentCp from '../game/player/getters/getCurrentCp.js';

export default function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            if (getCurrentCp(session) === getMaxCp(session)) {
                continue;
            }

            if (getCurrentCp(session) > getMaxCp(session)) {
                session.game.gameClass.stats.cp = getMaxCp(session);
                continue;
            }

            let cpRegenSpeed = session.game.gameClass.stats.cpRestoreSpeed;

            if (isPlayerInFight(session)) {
                cpRegenSpeed *= 0.2;
            }

            session.game.gameClass.stats.cp = Math.min(getMaxCp(session), getCurrentCp(session) + cpRegenSpeed);
        }
    }
}