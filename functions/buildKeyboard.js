const getMembers = require('./getMembers');

module.exports = function (chatId, name) {
    let buttons = [];
    let tempArray = null;
    let i = 0;
    let members = getMembers(chatId);

    for (let [key, member] of Object.entries(members)) {
        if (i % 3 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }
        tempArray.push({text: member.userChatData.user.first_name, callback_data: `${name}.${key}`});
        i++;
    }

    return buttons;
};