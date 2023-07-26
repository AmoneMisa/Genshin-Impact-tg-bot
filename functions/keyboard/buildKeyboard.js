const getMembers = require('../getters/getMembers');

module.exports = function (chatId, name) {
    let buttons = [];
    let tempArray = null;
    let i = 0;
    let members = getMembers(chatId);
    let filteredMembers = Object.values(members).filter(member => !member.userChatData.user.is_bot);

    for (let [key, member] of Object.entries(filteredMembers)) {
        if (i % 3 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }
        tempArray.push({text: member.userChatData.user.first_name, callback_data: `${name}.${key}`});
        i++;
    }

    return buttons;
};