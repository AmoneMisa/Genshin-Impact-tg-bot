const fs = require('fs');

let sessions;
let titles;
let bosses;

try {
    let sessionsJson = fs.readFileSync("./sessions.json");
    sessions = JSON.parse(sessionsJson);
} catch (e) {
    sessions = {};
}

try {
    let titlesJson = fs.readFileSync("./titles.json");
    titles = JSON.parse(titlesJson);
} catch (e) {
    titles = {};
}

try {
    let bossesJson = fs.readFileSync("./bosses.json");
    bosses = JSON.parse(bossesJson);
} catch (e) {
    bosses = {};
}

module.exports = {
    chatId: null,
    sessions,
    titles,
    bosses
};