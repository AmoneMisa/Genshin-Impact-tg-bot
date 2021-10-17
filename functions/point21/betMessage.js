module.exports = function (chatSession, members) {
    let str = "";

    for (let [id, player] of Object.entries(chatSession.pointPlayers)) {
        if (id === "bot") {
            continue;
        }

        str += `Ставка ${members[id].userChatData.user.username} - ${player.bet}\n`;
    }
    return str;
};