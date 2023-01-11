const getOffset = require('../../getters/getOffset');
const {sessions} = require('../../../data');

module.exports = function () {
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