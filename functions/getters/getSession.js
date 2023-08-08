const userTemplate = require('../../templates/userTemplate');
const bot = require('../../bot');
const getMembers = require('./getMembers');
const getLostedFieldsInSession = require('./getLostedFieldsInSession');
const classStatsTemplate = require('../../templates/classStatsTemplate');
const classSkillsTemplate = require('../../templates/classSkillsTemplate');

module.exports = async function (chatId, userId) {
    let members = getMembers(chatId);
    let getUpdatedData = await bot.getChatMember(chatId, userId);

    if (!members[userId]) {
        members[userId] = {
            isHided: false,
            user: {...userTemplate},
            gender: "male"
        };
    }

    members[userId].userChatData = Object.assign({}, getUpdatedData);
    getLostedFieldsInSession(members[userId]);

    let className = members[userId].game.gameClass.stats.name || 'noClass';

    if (!classSkillsTemplate[className]) {
        throw new Error("Not found skills for class " + className);
    }

    let foundedClassSkills = classSkillsTemplate[className];
    let foundedClassStats = classStatsTemplate.find(_class => _class.name === className);

    if (!foundedClassStats) {
        throw new Error("Not found stats for class " + className);
    }

    members[userId].game.gameClass.stats = Object.assign({}, foundedClassStats, members[userId].game.gameClass.stats);
    members[userId].game.gameClass.skills = [...foundedClassSkills];

    return members[userId];
};