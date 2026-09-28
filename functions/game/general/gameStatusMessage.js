import getUserName from "../../getters/getUserName.js";

export default async function (chatSession, members, gameName) {
    let str = `Участники игры в ${gameNames[gameName]}:\n`;

    for (let [id, player] of Object.entries(chatSession.game[gameName].players)) {
        if (id === "bot") {
            continue;
        }

        str += `${await getUserName(id)}\n`;
    }
    return str;
};

const gameNames = {
    elements: "Элементы",
    points: "21 очко"
};