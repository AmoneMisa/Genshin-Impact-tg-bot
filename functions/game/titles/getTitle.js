const titlesActions = require('../../../dictionaries/titlesActions');
const titlesActionsFemale = require('../../../dictionaries/titlesActions_female');
const titlesWhat = require('../../../dictionaries/titlesWhat');
const titlesWith = require('../../../dictionaries/titlesWith');
const titlesWhere = require('../../../dictionaries/titlesWhere');
const titlesWhereFemale = require('../../../dictionaries/titlesWhere_female');
const {titles} = require('../../../data');
const isFemale = require('../../form/isFemale');
const getRandom = require('../../getters/getRandom');
const getUserName = require('../../getters/getUserName');

module.exports = function (chatId, session) {
    if (!titles[chatId]) {
        titles[chatId] = [];
    }

    let title;

    if (session.user.gender && isFemale(session.user.gender)) {
        title = `${titlesActionsFemale[getRandom(0, titlesActionsFemale.length - 1)]} ${titlesWhat[getRandom(0, titlesWhat.length - 1)]} ${titlesWith[getRandom(0, titlesWith.length - 1)]} ${titlesWhereFemale[getRandom(0, titlesWhereFemale.length - 1)]}`;
    } else {
        title = `${titlesActions[getRandom(0, titlesActions.length - 1)]} ${titlesWhat[getRandom(0, titlesWhat.length - 1)]} ${titlesWith[getRandom(0, titlesWith.length - 1)]} ${titlesWhere[getRandom(0, titlesWhere.length - 1)]}`;
    }

    titles[chatId].unshift({title: title, user: getUserName(session, "nickname")});

    while (titles[chatId].length > 10) {
        titles[chatId].pop();
    }

    return title;
};
