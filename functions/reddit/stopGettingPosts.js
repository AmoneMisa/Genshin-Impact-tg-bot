module.exports = function (redditName, session) {
    session.reddit.subscribes[redditName].sheduler.isStart = false;
}