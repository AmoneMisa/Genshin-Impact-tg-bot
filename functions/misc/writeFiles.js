import {sessions, arenaRating, titles, arenaTempBots, bosses} from '../../data.js';
import fs from 'fs';

export default function (backup) {
    writeFile("sessions", sessions, backup);
    writeFile("bosses", bosses, backup);
    writeFile("titles", titles, backup);
    writeFile("arenaRating", arenaRating, backup);
    writeFile("arenaTempBots", arenaTempBots, backup);
}

function writeFile(name, data, backup) {
    if (backup) {
        fs.renameSync(`./${name}.json`, `./${name}-${(new Date()).getTime()}.json`);
    }

    fs.writeFileSync(`./${name}.json`, JSON.stringify(data));
}