const setPlayerClassCallback = require('./setPlayerClassCallback');
const userSkillsCallback = require('./userSkillsCallback');
const showInventory = require('./showInventory');
const updateCharacteristics = require('./updateCharacteristics');
const reloadWhoAmI = require('./reloadWhoAmI');
const stealResources = require('./stealResources');
const addStealChance = require('./addStealChance');
const addBonusChance = require('./addBonusChance');
const changeGender = require('./changeGender');
const characterStatus = require('./characterStatus');
const whoamiHome = require('./whoamiHome');

module.exports = [
    ...setPlayerClassCallback,
    ...userSkillsCallback,
    ...showInventory,
    ...updateCharacteristics,
    ...reloadWhoAmI,
    ...stealResources,
    ...addStealChance,
    ...changeGender,
    ...characterStatus,
    ...whoamiHome,
    ...addBonusChance
];