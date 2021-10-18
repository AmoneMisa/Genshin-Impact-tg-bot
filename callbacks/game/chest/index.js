const openChest = require('./openChest');
const setUserChestTimer = require('./setUserChestTimer');

module.exports = [
    ...openChest,
    ...setUserChestTimer
];