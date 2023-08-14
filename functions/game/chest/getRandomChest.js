module.exports = function (chatId) {
    let buttons = [];
    let tempArray = null;
    let i = 0;
    let chests = [{text: "\u2754", callback_data: `chest.${chatId}_1`}, {text: "\u2754", callback_data: `chest.${chatId}_2`},
        {text: "\u2754", callback_data: `chest.${chatId}_3`}, {text: "\u2754", callback_data: `chest.${chatId}_4`}, {text: "\u2754", callback_data: `chest.${chatId}_5`},
        {text: "\u2754", callback_data: `chest.${chatId}_6`}, {text: "\u2754", callback_data: `chest.${chatId}_7`}, {text: "\u2754", callback_data: `chest.${chatId}_8`},
        {text: "\u2754", callback_data: `chest.${chatId}_9`}];

    for (let chest of chests) {
        if (i % 3 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }
        tempArray.push(chest);
        i++;
    }

    return buttons;
};