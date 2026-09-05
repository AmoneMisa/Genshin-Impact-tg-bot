import {myId} from "../../config.js";
import getUser from "./getUser.js";

export default async function(chatId, userId) {
    const user = await getUser(chatId, userId);
    if (user) {
        const status = user.userChatData?.status;
        if (status === "administrator" || status === "creator") {
            return true;
        }
    }

    return userId === myId;
}
