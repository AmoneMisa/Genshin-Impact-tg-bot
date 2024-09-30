import { sessions } from '../../../data.js';
import getMembers from '../../getters/getMembers.js';
import getArenaBots from './getArenaBots.js';

export default function (arenaType, chatId, callerId, withBots, rating) {
    let members = {};

    if (arenaType === "expansion") {
        for (let chatSession of Object.values(sessions)) {
            for (let session of Object.values(chatSession.members)) {
                if (session.userChatData.user.is_bot) {
                    continue;
                }

                members[session.userChatData.user.id] = session;
            }
        }
    } else {
        members = getMembers(chatId);
    }

    if (withBots) {
        let filteredMembers = Object.values(members).filter(member => !member.userChatData.user.is_bot && !member.isHided && member.userChatData.user.id !== callerId);
        let arenaBots = getArenaBots(rating);
        if (arenaBots.length > 0) {
            filteredMembers = filteredMembers.concat(arenaBots);
        }

        return filteredMembers;
    }

    return Object.values(members).filter(member => !member.userChatData.user.is_bot && !member.isHided && member.userChatData.user.id !== callerId);
}