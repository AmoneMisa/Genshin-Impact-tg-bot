const getTitle = require('./getTitle');

module.exports = function (chatId, session) {
    let newDate = Math.round(new Date().getTime() / 1000);
    if (!session.timerTitleCallback || (newDate - session.timerTitleCallback) >= 0) {
        session.timerTitleCallback = Math.round(new Date().getTime() / 1000 + 600);
        return `Сегодня ты, @${session.userChatData.user.username}, ${getTitle(chatId, session)}!`;
    } else {
        if ((session.timerTitleCallback - newDate) < 60) {
            return `@${session.userChatData.user.username}, команду можно вызывать раз в 10 минут. Осталось: ${(session.timerTitleCallback - newDate)} сек`;
        } else if ((session.timerTitleCallback - newDate) > 60) {
            return `@${session.userChatData.user.username}, команду можно вызывать раз в 10 минут. Осталось: ${Math.round((session.timerTitleCallback - newDate) / 60)} мин`;
        }
    }
};