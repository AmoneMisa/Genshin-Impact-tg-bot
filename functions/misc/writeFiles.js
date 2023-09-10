const data = require("../../data");
const fs = require("fs");

module.exports = function (backup) {
    writeFile("sessions", data.sessions, backup);
    writeFile("bosses", data.bosses, backup);
    writeFile("titles", data.titles, backup);
    writeFile("arenaRating", data.arenaRating, backup);
    writeFile("arenaTempBots", data.arenaTempBots, backup);
}

function writeFile(name, data, backup) {
    if (backup) {
        fs.renameSync(`./${name}.json`, `./${name}-${(new Date()).getTime()}.json`);
    }

    fs.writeFileSync(`./${name}.json`, JSON.stringify(data));
}