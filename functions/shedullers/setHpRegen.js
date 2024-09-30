import { sessions } from '../../data.js';
import isPlayerInFight from '../game/player/isPlayerInFight.js';
import getMaxHp from '../game/player/getters/getMaxHp.js';
import getCurrentHp from '../game/player/getters/getCurrentHp.js';

export default function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            let hpRegenSpeed = session.game.gameClass.stats.hpRestoreSpeed;

            if (getCurrentHp(session) > getMaxHp(session)) {
                session.game.gameClass.stats.hp = getMaxHp(session);
                continue;
            }

            if (getCurrentHp(session) === getMaxHp(session)) {
                continue;
            }

            if (getCurrentHp(session) <= 0) {
                continue;
            }

            if (isPlayerInFight(session)) {
                hpRegenSpeed *= 0.35;
            }

            session.game.gameClass.stats.hp = Math.min(getMaxHp(session), getCurrentHp(session) + hpRegenSpeed);
        }
    }
}