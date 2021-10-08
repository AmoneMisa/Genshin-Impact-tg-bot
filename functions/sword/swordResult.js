function getTime(datetime) {
    let remain = (datetime || 0) - new Date().getTime();
    let remainSeconds = Math.floor(remain / 1000);
    let remainMinutes = Math.floor(remainSeconds / 60);
    let remainHours = Math.floor(remainMinutes / 60);

    return [remain, remainHours, remainMinutes % 60, remainSeconds % 60];
}

function getOffset() {
    let date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return new Date().getTime() + date.getTime();
}

module.exports = function (session) {
    let [remain, hours, minutes, seconds] = getTime(session.timerSwordCallback);

    if (remain > 0) {
        if (hours > 0) {
            return `@${session.userChatData.user.username}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${hours} ч ${minutes} мин ${seconds} сек`;
        } else if (minutes > 0) {
            return `@${session.userChatData.user.username}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${minutes} мин ${seconds} сек`;
        } else {
            return `@${session.userChatData.user.username}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${seconds} сек`;
        }
    }

    session.timerSwordCallback = getOffset(24 * 60 * 60);

    if (!session.sword) {
        session.sword = 0;
    }

    let result;

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    let int = getRandomInt(-10, 15);
    session.sword += int;
    if (int > 0) {
        result = `@${session.userChatData.user.username}, твой меч увеличился на ${int} мм. Сейчас он равен: ${session.sword} мм`;
    } else {
        result = `@${session.userChatData.user.username}, твой меч укоротился на ${int} мм. Сейчас он равен: ${session.sword} мм`;
    }

    return result;
};