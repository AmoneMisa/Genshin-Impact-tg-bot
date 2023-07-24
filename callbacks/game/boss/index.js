const sendGoldCallback = require('./sendGoldCallback');
const boss = require('./boss');

module.exports = [
    ...sendGoldCallback,
    ...boss
];