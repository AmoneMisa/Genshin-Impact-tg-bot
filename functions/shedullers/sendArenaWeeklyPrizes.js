import { arenaRating, sessions } from '../../data.js';
import updateRank from '../../functions/game/arena/updateRank.js';
import arenaWeeklyPrize from '../../template/arenaWeeklyPrizes.js';
import pvpSignTemplate from '../../template/pvpSignTemplate.js';
import lodash from 'lodash';

export default function () {
    for (let [chatSessionId, chatSession] of Object.entries(sessions)) {
        for (let [sessionId, session] of Object.entries(chatSession)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            let playerRankCommon = updateRank(sessionId, "common", chatSessionId);
            let playerRankExpansion = updateRank(sessionId, "expansion", chatSessionId);
            session.game.inventory["arena"]["tokens"] += arenaWeeklyPrize.find(reward => reward.rank === playerRankCommon).reward;
            session.game.inventory["arena"]["tokens"] += arenaWeeklyPrize.find(reward => reward.rank === playerRankExpansion).reward;

            if (lodash.isNull(session.game?.inventory?.arena?.pvpSign)) {
                session.game.inventory["arena"].pvpSign = pvpSignTemplate;
                session.game.inventory["arena"].pvpSign.lifeTime = new Date().getTime() + pvpSignTemplate.lifeTime;
            }
        }
    }

    for (let ratingKey of Object.keys(arenaRating.expansion)) {
        arenaRating.expansion[ratingKey] = 1000;
    }

    for (let chatRating of Object.values(arenaRating.common)) {
        for (let ratingKey of Object.keys(chatRating)) {
            chatRating[ratingKey] = 1000;
        }
    }
}