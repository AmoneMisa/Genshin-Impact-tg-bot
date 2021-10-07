function getTime(datetime) {
    let remain = (datetime || 0) - new Date().getTime();
    let remainSeconds = Math.floor(remain / 1000);
    let remainMinutes = Math.floor(remainSeconds / 60);
    let remainHours = Math.floor(remainMinutes / 60);

    return [remain, remainHours, remainMinutes % 60, remainSeconds % 60];
}

function getOffset(seconds) {
    return new Date().getTime() + seconds * 1000;
}

module.exports = function (session) {
    let [remain, hours, minutes, seconds] = getTime(session.timerSwordCallback);

    if (remain > 0) {
        if (hours > 0) {
            return `@${session.userChatData.user.username}, команду можно вызывать раз в сутки. Осталось: ${hours} ч ${minutes} мин ${seconds} сек`;
        } else if (minutes > 0) {
            return `@${session.userChatData.user.username}, команду можно вызывать раз в сутки. Осталось: ${minutes} мин ${seconds} сек`;
        } else {
            return `@${session.userChatData.user.username}, команду можно вызывать раз в сутки. Осталось: ${seconds} сек`;
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
        result = `@${session.userChatData.user.username}, увеличился на ${int} см. Сейчас он равен: ${session.sword} мм`;
    } else {
        result = `@${session.userChatData.user.username}, укоротился на ${int} см. Сейчас он равен: ${session.sword} мм`;
    }

    return result;
};