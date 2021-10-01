const userCallbacks = require('./user');
const closeCallback = require('./close');

module.exports = [
    ...userCallbacks,
    ...closeCallback
];