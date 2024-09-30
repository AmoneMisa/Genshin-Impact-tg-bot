import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import getMembers from '../functions/getters/getMembers.js';
import bot from '../bot.js';
import { myId } from '../config.js';
import {sessions, updTrustedChats} from '../data.js';
import fs from 'fs';
import deleteMessage from '../functions/tgBotFunctions/deleteMessage.js';
import getLostFieldsInSession from "../functions/getters/getLostFieldsInSession.js";
import getSession from "../functions/getters/getSession.js";

export default [[/(?:^|\s)\/update_users\b/, async (msg) => {
    if (msg.from.id !== myId) {
        return;
    }

    for (let chatId of Object.keys(sessions)) {
        for (let userId of Object.keys(getMembers(chatId))) {
            getLostFieldsInSession(getSession(chatId, userId, chatId));
        }
    }

    sendMessage(myId, "Введи id чата, чтобы добавить его в доверенные.");
}]];
