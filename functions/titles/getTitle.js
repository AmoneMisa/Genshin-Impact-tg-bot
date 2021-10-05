const titlesMale = require('../../dictionaries/titles_male');
const titlesFemale = require('../../dictionaries/titles_female');
const {titles} = require('../../data');

const isFemale = require('../menu/isFemale');

module.exports = function (session) {
    function getRandomIndex(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    let title;

    if (session.user.gender && isFemale(session.user.gender)) {
        title = titlesFemale[getRandomIndex(0, titlesFemale.length - 1)];
    } else {
        title = titlesMale[getRandomIndex(0, titlesMale.length - 1)];
    }

    titles.unshift({title: title, user: session.userChatData.user.username});

    while (titles.length > 10) {
        titles.pop();
    }

    return title;
};