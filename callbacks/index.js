const userCallbacks = require('./user');
const closeCallback = require('./close');
const gameCallback = require('./game');
const help = require('./help');

module.exports = [
    ...userCallbacks,
    ...closeCallback,
    ...gameCallback,
    ...help
];