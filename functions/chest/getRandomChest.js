module.exports = function () {
    let buttons = [];
    let tempArray = null;
    let i = 0;
    let chests = [{text: "\u2754", callback_data: "chest_1"}, {text: "\u2754", callback_data: "chest_2"},
        {text: "\u2754", callback_data: "chest_3"}, {text: "\u2754", callback_data: "chest_4"}, {text: "\u2754", callback_data: "chest_5"},
        {text: "\u2754", callback_data: "chest_6"}, {text: "\u2754", callback_data: "chest_7"}, {text: "\u2754", callback_data: "chest_8"},
        {text: "\u2754", callback_data: "chest_9"}, {text: "\u2754", callback_data: "chest_10"}, {text: "\u2754", callback_data: "chest_11"},
        {text: "\u2754", callback_data: "chest_12"}];

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