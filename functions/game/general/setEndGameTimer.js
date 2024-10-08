const timersMap = {};

export default function (chatSession, timer, chatId, gameName, callback) {
    if (timersMap[gameName]) {
        clearTimeout(timersMap[gameName]);
        delete timersMap[gameName];
    }

    if (callback) {
        timersMap[gameName] = +setTimeout(callback, timer);
    }
};