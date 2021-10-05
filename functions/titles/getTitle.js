const titlesArray = require('../../dictionaries/titles');
const {titles} = require('../../data');

module.exports = function (session) {
    function getRandomIndex(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    let title = titlesArray[getRandomIndex(0, titlesArray.length - 1)];
    console.log(titles);
    titles.unshift({title: title, user: session.userChatData.user.username});

    while (titles.length > 10) {
        titles.pop();
    }

    return title;
};