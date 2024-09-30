import { myId } from '../../config.js';
import sendMessage from './sendMessage.js';

export default function (message) {
    if (typeof message !== "string") {
        message = JSON.stringify(message, null, 4);
    }
    sendMessage(myId, message);
};