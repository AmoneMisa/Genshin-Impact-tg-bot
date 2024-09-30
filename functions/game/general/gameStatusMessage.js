export default function (chatSession, members, gameName) {
    let str = `Участники игры в ${gameNames[gameName]}:\n`;

    for (let [id, player] of Object.entries(chatSession.game[gameName].players)) {
        if (id === "bot") {
            continue;
        }

        str += `${members[id].userChatData.user.username}\n`;
    }
    return str;
};

const gameNames = {
    elements: "Элементы",
    point: "21 очко"
};