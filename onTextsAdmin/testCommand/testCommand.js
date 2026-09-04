import {myId} from "../../config.js";
import debugMessage from "../../functions/tgBotFunctions/debugMessage.js";

export default [[/(?:^|\s)\/test\b/, async (msg) => {
    if (msg.from.id !== myId) {
        return;
    }

    if (response) {
        debugMessage(response);
    } else {
        console.error(response);
    }
}]]