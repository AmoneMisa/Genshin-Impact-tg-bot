const sendGoldCallback = require('./sendGoldCallback');
const userSkillsCallback = require('../player/userSkillsCallback');

module.exports = [
    ...sendGoldCallback,
    ...userSkillsCallback
];