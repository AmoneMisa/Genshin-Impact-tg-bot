const bossCallback = require('./boss');
const chestCallback = require('./chest');
const experienceCallback = require('./experience');
const goldCallback = require('./gold');
const ironOre = require('./ironOre');
const crystalsCallback = require('./crystals');
const points21 = require('./points21');
const swordCallback = require('./sword');
const player = require('./player');
const slots = require('./slots');
const dice = require('./dice');
// const reddit = require('./reddit');
const bowling = require('./bowling');
const darts = require('./darts');
const basketball = require('./basketball');
const football = require('./football');
const elements = require('./elements');
const builds = require('./builds');
const shop = require('./shop');

module.exports = [
    ...bossCallback,
    ...goldCallback,
    ...ironOre,
    ...experienceCallback,
    ...crystalsCallback,
    ...chestCallback,
    ...swordCallback,
    ...points21,
    ...player,
    ...slots,
    ...dice,
    // ...reddit,
    ...bowling,
    ...darts,
    ...basketball,
    ...football,
    ...elements,
    ...builds,
    ...shop
];
