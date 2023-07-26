const getMembers = require('../getters/getMembers');

module.exports = function (chatId, name) {
    let buttons = [];
    let tempArray = null;
    let i = 0;
    let members = getMembers(chatId);
    let filteredMembers = Object.values(members).filter(member => !member.userChatData.user.is_bot);

    for (let member of filteredMembers) {
        if (i % 3 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }
        tempArray.push({text: member.userChatData.user.first_name, callback_data: `${name}.${member.userChatData.user.id}`});
        i++;
    }

    console.log(buttons);
    return buttons;
};