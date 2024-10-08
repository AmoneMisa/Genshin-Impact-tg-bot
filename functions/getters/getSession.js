import userTemplate from '../../template/userTemplate.js';
import bot from '../../bot.js';
import getMembers from './getMembers.js';
import getLostFieldsInSession from './getLostFieldsInSession.js';
import classStatsTemplate from '../../template/classStatsTemplate.js';
import classSkillsTemplate from '../../template/classSkillsTemplate.js';
import debugMessage from "../tgBotFunctions/debugMessage.js";

export default async function (chatId, userId) {
    let members = getMembers(chatId);
    let getUpdatedData;

    try {
        getUpdatedData = await bot.getChatMember(chatId, userId);
    } catch (e) {
        debugMessage(`getUpdatedData | getChatMember error: ${e}`);
        throw new Error(`getUpdatedData | getChatMember error: ${e}`);
    }

    if (!members[userId]) {
        members[userId] = {
            isHided: false,
            user: {...userTemplate},
            gender: "male"
        };
    }

    members[userId].userChatData = Object.assign({}, getUpdatedData);
    getLostFieldsInSession(members[userId]);

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