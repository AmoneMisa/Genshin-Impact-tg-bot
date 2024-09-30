import getBuildList from './getBuildList.js';

export default async function (chatId, userId, buildName) {
    return (await getBuildList(chatId, userId))[buildName];
};