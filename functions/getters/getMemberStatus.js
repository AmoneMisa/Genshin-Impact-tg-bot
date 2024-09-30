import getMembers from './getMembers.js';
import { myId } from '../../config.js';

export default function (chatId, userId) {
    let members = getMembers(chatId);

    if (members[userId]) {
        if (members[userId].userChatData.status === "administrator") {
            return true;
        }

        if (members[userId].userChatData.status === "creator") {
            return true;
        }
    }

    return userId === myId;
}