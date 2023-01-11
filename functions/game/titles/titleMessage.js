const getTitle = require('./getTitle');
const getUserName = require('../../getters/getUserName');

module.exports = function (chatId, session) {
    let newDate = Math.round(new Date().getTime() / 1000);
    if (!session.timerTitleCallback || (newDate - session.timerTitleCallback) >= 0) {
        session.timerTitleCallback = Math.round(new Date().getTime() / 1000 + 600);
        return `Сегодня ты, @${getUserName(session, "nickname")}, ${getTitle(chatId, session)}!`;
    } else {
        if ((session.timerTitleCallback - newDate) < 60) {
            return `@${getUserName(session, "nickname")}, команду можно вызывать раз в 10 минут. Осталось: ${(session.timerTitleCallback - newDate)} сек`;
        } else if ((session.timerTitleCallback - newDate) > 60) {
            return `@${getUserName(session, "nickname")}, команду можно вызывать раз в 10 минут. Осталось: ${Math.round((session.timerTitleCallback - newDate) / 60)} мин`;
        }
    }
};