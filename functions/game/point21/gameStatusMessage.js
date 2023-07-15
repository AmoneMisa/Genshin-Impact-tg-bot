module.exports = function (chatSession, members) {
    let str = "Участники:\n";

    for (let [id, player] of Object.entries(chatSession.game.points.players)) {
        if (id === "bot") {
            continue;
        }

        str += `${members[id].userChatData.user.username}\n`;
    }
    return str;
};