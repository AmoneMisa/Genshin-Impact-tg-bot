import getOffset from '../../getters/getOffset.js';
import { sessions } from '../../../data.js';

export default function () {
    let sessionsArray = Object.values(sessions);

    for (let chatSessions of sessionsArray) {
        let chatSessionsArray = Object.values(chatSessions);
        for (let session of chatSessionsArray) {
            if (session.timerSwordCallback && session.timerSwordCallback > new Date().getTime()) {
                session.timerSwordCallback = getOffset();
            }
        }
    }
};