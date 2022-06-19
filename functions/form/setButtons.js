module.exports = function (commands) {
    let buttons = [];
    let tempArray = [];
    let button = {};
    let i = 0;
    for (let command of commands) {
        if (i % 2 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }
        button.text = `/set${command[0].toUpperCase()}${command.slice(1)}`;

        tempArray.push(button);
        button = {};
        i++;
    }

    buttons.push(["/remove_keyboard"]);

    return buttons;
};