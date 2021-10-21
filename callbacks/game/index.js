const bossCallback = require('./boss');
const chestCallback = require('./chest');
const experienceCallback = require('./experience');
const goldCallback = require('./gold');
const points21 = require('./points21Callback');
const swordCallback = require('./sword');
const player = require('./player');

module.exports = [
    ...bossCallback,
    ...goldCallback,
    ...experienceCallback,
    ...chestCallback,
    ...swordCallback,
    ...points21,
    ...player
];
