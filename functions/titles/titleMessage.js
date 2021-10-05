const getTitle = require('./getTitle');

let timerTitleCallback;

module.exports = function (session) {
    let newDate = Math.round(new Date().getTime() / 1000);
    if (!timerTitleCallback || (newDate - timerTitleCallback) >= 0) {
        timerTitleCallback = Math.round(new Date().getTime() / 1000 + 90);
        return `Сегодня ты, @${session.userChatData.user.username}, ${getTitle(session)}!`;
    } else {
        if ((timerTitleCallback - newDate) < 60) {
            return `Команду можно вызывать раз в 1.30 минут. Осталось: ${(timerTitleCallback - newDate)} сек`;
        } else if ((timerTitleCallback - newDate) > 60) {
            return `Команду можно вызывать раз в 1.30 минут. Осталось: ${Math.round((timerTitleCallback - newDate) / 60)} мин`;
        }
    }
};