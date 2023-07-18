const setPlayerClassCallback = require('./setPlayerClassCallback');
const userSkillsCallback = require('./userSkillsCallback');
const exchangeCallback = require('./exchangeCallback');
const showInventory = require('./showInventory');

module.exports = [...setPlayerClassCallback, ...userSkillsCallback, ...exchangeCallback, ...showInventory];