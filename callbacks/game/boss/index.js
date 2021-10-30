const sendGoldCallback = require('./sendGoldCallback');
const userSkillsCallback = require('./userSkillsCallback');

module.exports = [
    ...sendGoldCallback,
    ...userSkillsCallback
];