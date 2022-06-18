const bossCallback = require('./boss');
const chestCallback = require('./chest');
const experienceCallback = require('./experience');
const goldCallback = require('./gold');
const crystalsCallback = require('./crystals');
const points21 = require('./points21');
const swordCallback = require('./sword');
const player = require('./player');
const slots = require('./slots');
const dice = require('./dice');

module.exports = [
    ...bossCallback,
    ...goldCallback,
    ...experienceCallback,
    ...crystalsCallback,
    ...chestCallback,
    ...swordCallback,
    ...points21,
    ...player,
    ...slots,
    ...dice,
];
