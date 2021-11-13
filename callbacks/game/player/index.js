const setPlayerClassCallback = require('./setPlayerClassCallback');
const userSkillsCallback = require('./userSkillsCallback');
const exchangeCallback = require('./exchangeCallback');

module.exports = [...setPlayerClassCallback, ...userSkillsCallback, ...exchangeCallback];