const userCallbacks = require('./user');
const closeCallback = require('./close');
const gameCallback = require('./game');


module.exports = [
    ...userCallbacks,
    ...closeCallback,
    ...gameCallback
];