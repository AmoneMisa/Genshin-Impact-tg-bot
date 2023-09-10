module.exports = function (callerId, name, rating, arenaType, chatId, showedPlayers) {
    let buttons = [];
    let tempArray = null;
    let i = 0;

    for (let member of showedPlayers) {
        if (i % 3 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }

        if (member.hasOwnProperty("rating")) {
            tempArray.push({text: `Игрок №${member.name}`, callback_data: `${name}.bot_${member.name}`});
        } else {
            tempArray.push({
                text: member.userChatData.user.first_name,
                callback_data: `${name}.${member.userChatData.user.id}`
            });
        }
        i++;
    }

    return buttons;
}