const getChatSession = require("../getters/getChatSession");
const axios = require("axios");
const snoowrap = require('snoowrap');
const {reddit} = require('../../config');

const redd = new snoowrap(reddit);

module.exports = async function (name, session, chatId) {
    let chatSession = getChatSession(chatId);

    if (!chatSession.reddit) {
        chatSession.reddit = {};
    }

    if (!chatSession.reddit.subscribes) {
        chatSession.reddit.subscribes = [];
    }

    if (session.reddit.subscribes.hasOwnProperty(name)) {
        return false;
    }

    if (!chatSession.reddit.subscribes[name]) {
        chatSession.reddit.subscribes[name] = 1;
    } else {
        chatSession.reddit.subscribes[name]++;
    }

    try {
        const result = await axios.get(`https://www.reddit.com/r/${name.replaceAll(/\s/g, "")}/about.json`);
        if (result.status === 200) {
            session.reddit.subscribes[name] = {
                name: "",
                timer: 2,
                isStart: true
            };
            return true;
        }
    } catch (e) {
        console.error(e);
        return e;
    }
};
