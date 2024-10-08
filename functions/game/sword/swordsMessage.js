import getUserName from '../../getters/getUserName.js';

export default function (sessions) {
    let arrSessions = Object.values(sessions);

    if (arrSessions.length === 0) {
        return "Ещё никто не отрастил свой меч. Сделать это можно командой /sword";
    }

    let message = "Мечи группы \n\n";
    arrSessions = arrSessions.filter(item => item.sword !== undefined);
    arrSessions.sort((a, b) => b.sword - a.sword);

    for (let session of arrSessions) {
        message += `${getUserName(session, "name")}: ${session.sword} мм.\n`;
    }

    return message;
};