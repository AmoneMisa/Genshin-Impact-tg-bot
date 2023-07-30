const setPlayerClassCallback = require('./setPlayerClassCallback');
const userSkillsCallback = require('./userSkillsCallback');
const exchangeCallback = require('./exchangeCallback');
const showInventory = require('./showInventory');
const updateCharacteristics = require('./updateCharacteristics');
const reloadWhoAmI = require('./reloadWhoAmI');
const stealResources = require('./stealResources');
const addStealChance = require('./addStealChance');

module.exports = [
    ...setPlayerClassCallback,
    ...userSkillsCallback,
    ...exchangeCallback,
    ...showInventory,
    ...updateCharacteristics,
    ...reloadWhoAmI,
    ...stealResources,
    ...addStealChance
];