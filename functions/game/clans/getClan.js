import {clans} from "../../../data.js";

export default function (userId) {
    for (let clan of Object.values(clans)) {
        if (clan.members.includes(userId)) {
            return clan;
        }
    }

    return null;
}