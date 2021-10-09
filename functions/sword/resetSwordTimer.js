const getOffset = require('../getOffset');

module.exports = function (sessions) {
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