const axios = require("axios");

module.exports = function (name, action) {
    return axios.post('https://www.reddit.com/api/subscribe', {
        "action": action,
        "sr_name": name
    });
};
