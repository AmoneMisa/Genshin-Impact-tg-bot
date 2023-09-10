const getMembers = require("../../getters/getMembers");
const {sessions} = require("../../../data");

module.exports = function (callerId, name, arenaType, arenaBots, chatId) {
    let buttons = [];
    let tempArray = null;
    let i = 0;
    let members = {};

    if (arenaType === "expansion") {
        for (let chatSession of Object.values(sessions)) {
            for (let session of Object.values(chatSession.members)) {
                if (session.userChatData.user.is_bot) {
                    continue;
                }

                members[session.userChatData.user.id] = session;
            }
        }
    } else {
        members = getMembers(chatId);
    }

    let filteredMembers = Object.values(members).filter(member => !member.userChatData.user.is_bot && !member.isHided && member.userChatData.user.id !== callerId);

    if (arenaBots.length > 0) {
        filteredMembers = filteredMembers.concat(arenaBots);
    }

    for (let member of filteredMembers) {
        if (i % 3 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }

        if (member.hasOwnProperty("ratingKey")) {
            tempArray.push({text: `Игрок №${member.name}`, callback_data: `${name}.bot`});
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