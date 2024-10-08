import buttonsDictionary from '../../dictionaries/buttons.js';

export default function (name, buttonRows, page, homeName = null, homeButtonName = "Главная") {
    if (!buttonRows.length) {
        return [[{
            text: buttonsDictionary["ru"].close,
            callback_data: "close"
        }]];
    }

    let pageSize = 3;
    let countPages = Math.ceil(buttonRows.length / pageSize);
    let currentPage = page || 1;
    let lastPage = countPages;
    let firstPage = 1;
    let start = (page - 1) * pageSize;
    let currentButtons = buttonRows.slice(start, start + pageSize);

    let controlButtons = [];

    if (currentPage !== firstPage) {
        controlButtons.push({
            text: buttonsDictionary["ru"].prev,
            callback_data: `${name}_${currentPage - 1}`,
        });
    }

    controlButtons.push({
        text: buttonsDictionary["ru"].close,
        callback_data: "close"
    });

    if (currentPage !== lastPage) {
        controlButtons.push({
            text: buttonsDictionary["ru"].next,
            callback_data: `${name}_${currentPage + 1}`,
        });
    }

    if (homeName) {
        controlButtons.push({
           text: homeButtonName,
           callback_data: homeName
        });
    }

    return [
        ...currentButtons,
        controlButtons
    ];
};