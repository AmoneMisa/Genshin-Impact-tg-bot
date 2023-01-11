const axios = require("axios");
const scheduler = require("node-schedule");

module.exports = function (redditName, countPosts, postsType, timer, session) {
    if (countPosts <= 0) {
        countPosts = 1;
    }

    if (countPosts > 10) {
        countPosts = 10;
    }

    if (postsType === null || postsType === undefined) {
        postsType = "hot";
    }

    if (timer.hour < 2) {
        timer = 2;
    }

    if (timer.hour > 24) {
        timer = 24;
    }

    if (timer.minute < 0) {
        timer.minute = 0;
    }

    const rule = new scheduler.RecurrenceRule();
    rule.hour = timer.hour;
    rule.minute = timer.minute;
    session.reddit.subscribes[redditName].sheduler = {
        timer: null,
        isStart: true
    }

    // min 2 hours
    // max 24 hours
    session.reddit.subscribes[redditName].sheduler.timer = scheduler.scheduleJob(rule, function () {
        return axios.get(`https://www.reddit.com/r/${redditName}/new.json?sort=${postsType}&limit=${countPosts}`);
    });
};
