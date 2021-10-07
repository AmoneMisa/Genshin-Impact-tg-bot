const fs = require('fs');

let sessions;
let titles;
let customButtons;

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
    titles = [];
}

try {
    let customButtonsJson = fs.readFileSync("./customButtons");
    customButtons = JSON.parse(customButtonsJson);
} catch (e) {
    customButtons = [];
}

module.exports = {
    chatId: null,
    sessions,
    titles,
    customButtons
};