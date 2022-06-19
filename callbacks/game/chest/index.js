const openChest = require('./openChest');
const setUserChestTimer = require('./receiveUserChestTimer');

module.exports = [
    ...openChest,
    ...setUserChestTimer
];