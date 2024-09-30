export default function (players, members) {
    let str = "";

    for (let [id, player] of Object.entries(players)) {
        if (id === "bot") {
            continue;
        }

        str += `Ставка ${members[id].userChatData.user.username} - ${player.bet}\n`;
    }
    return str;
};