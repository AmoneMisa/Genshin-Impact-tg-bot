import fs from 'fs';

export let sessions;
export let titles;
export let bosses;
export let trustedChats;
export let arenaRating;
export let arenaTempBots;

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
try {
    let arenaTempBotsJson = fs.readFileSync("./arenaTempBots.json");
    arenaTempBots = JSON.parse(arenaTempBotsJson);
} catch (e) {
    arenaTempBots = [];
}

export function updTrustedChats() {
    let _trustedChats;
    try {
        let trustedChatsJson = fs.readFileSync("./trustedChats.json");
        _trustedChats = JSON.parse(trustedChatsJson);
    } catch (e) {
        _trustedChats = [];
    }
    trustedChats.splice(0, trustedChats.length, ..._trustedChats);
}

export function updArenaTempBots() {
    let _arenaTempBots;
    try {
        let trustedChatsJson = fs.readFileSync("./arenaTempBots.json");
        _arenaTempBots = JSON.parse(arenaTempBotsJson);
    } catch (e) {
        _arenaTempBots = [];
    }
    arenaTempBots.splice(0, arenaTempBots.length, ..._arenaTempBots);
}

export let chatId = null;