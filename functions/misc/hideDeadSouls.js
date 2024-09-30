import {sessions} from '../../data.js';
import bot from '../../bot.js';

export default async function () {
    for (let [chatId, chatSession] of Object.entries(sessions)) {
        for (let [userId, session] of Object.entries(chatSession.members)) {
            bot.getChatMember(chatId, parseInt(userId)).then(chatMember => {
                session.isHided = chatMember.status === "left" || chatMember.status === "kicked" || chatMember.status === "banned";
            }).catch(reason => {
                session.isHided = true;
            });
        }
    }
}