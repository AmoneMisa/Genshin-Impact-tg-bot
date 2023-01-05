const userCallbacks = require('./user');
const closeCallback = require('./close');
const gameCallback = require('./game');
const help = require('./help');
const settings = require('./settings');

module.exports = [
    ...userCallbacks,
    ...closeCallback,
    ...gameCallback,
    ...settings,
    ...help
];