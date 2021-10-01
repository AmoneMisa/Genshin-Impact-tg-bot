const fs = require('fs');

let sessions;

try {
    let sessionsJson = fs.readFileSync("./sessions.json");
    sessions = JSON.parse(sessionsJson);
} catch (e) {
    sessions = {};
}

module.exports = {
    chatId: null,
    sessions
};