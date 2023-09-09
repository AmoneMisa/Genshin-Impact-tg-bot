const fs = require('fs');

let sessions;
let titles;
let bosses;
let trustedChats;
let arenaRating;

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

try {
    let trustedChatsJson = fs.readFileSync("./trustedChats.json");
    trustedChats = JSON.parse(trustedChatsJson);
} catch (e) {
    trustedChats = [];
}

try {
    let arenaRatingJson = fs.readFileSync("./arenaRating.json");
    arenaRating = JSON.parse(arenaRatingJson);
} catch (e) {
    arenaRating = {};
}

function updTrustedChats() {
    let _trustedChats;
    try {
        let trustedChatsJson = fs.readFileSync("./trustedChats.json");
        _trustedChats = JSON.parse(trustedChatsJson);
    } catch (e) {
        _trustedChats = [];
    }
    trustedChats.splice(0, trustedChats.length, ..._trustedChats);
}

module.exports = {
    chatId: null,
    sessions,
    titles,
    bosses,
    trustedChats,
    arenaRating,
    updTrustedChats
};